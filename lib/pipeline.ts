import { readFileSync } from 'fs'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { fal } from '@fal-ai/client'
import { clerkClient } from '@clerk/nextjs/server'
import { supabase, type Project } from '@/lib/supabase'
import { uploadToS3, getS3Url, getPresignedUrl, toFetchableUrl } from '@/lib/s3'
import { mergeVideo } from '@/lib/merge-video'
import { captionVideo } from '@/lib/caption-video'
import { addBgm } from '@/lib/add-bgm'
import { generateLipsyncWithHedra } from '@/lib/lipsync-hedra'
import { AVATARS, AVATAR_VOICE_MAP } from '@/lib/constants'
import { sendVideoReadyEmail } from '@/lib/email'

fal.config({ credentials: process.env.FAL_API_KEY })

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

async function updateProject(id: string, updates: Partial<Project>) {
  await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
}

async function notifyUser(userId: string, projectId: string): Promise<void> {
  try {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress
    if (!email) return
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there'
    await sendVideoReadyEmail(email, name, projectId)
  } catch (err) {
    // Email failure must never affect the generation result
    console.error(`[pipeline] Failed to send email for project ${projectId}:`, err)
  }
}

async function generateAudio(script: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY
  if (!apiKey) throw new Error('Eleven Labs API key not configured')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.2 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ElevenLabs error: ${text}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function runPipeline(projectId: string, project: Project): Promise<void> {
  const { script, selected_avatar, product_media_url, product_media_type, music_url } = project

  const provider = (process.env.LIPSYNC_PROVIDER ?? 'veed').toLowerCase()

  try {
    // ── Stage: audio ──
    let audioBuffer: Buffer
    if (project.audio_url) {
      const res = await fetch(await toFetchableUrl(project.audio_url))
      if (!res.ok) throw new Error('Failed to fetch existing audio')
      audioBuffer = Buffer.from(await res.arrayBuffer())
    } else {
      const voiceId = AVATAR_VOICE_MAP[selected_avatar]
      audioBuffer = await generateAudio(script!, voiceId)
      const audioKey = await uploadToS3(audioBuffer, 'audio', `audio-${Date.now()}.mp3`, 'audio/mpeg')
      await updateProject(projectId, { audio_url: getS3Url(audioKey) })
    }

    // ── Stage: lipsync ──
    let lipsyncVideoUrl: string
    if (project.lipsync_video_url) {
      lipsyncVideoUrl = project.lipsync_video_url
    } else {
      const avatar = AVATARS.find((a) => a.id === selected_avatar)!
      const imageFile = avatar.src.split('/').pop()!
      const imagePath = path.join(process.cwd(), 'public', 'avatars', imageFile)
      const imageBuffer = readFileSync(imagePath)
      const imageMimeType = imageFile.endsWith('.jpeg') || imageFile.endsWith('.jpg') ? 'image/jpeg' : 'image/png'

      let videoBuffer: Buffer

      async function runHedra(): Promise<Buffer> {
        const audioDurationMs = Math.ceil((audioBuffer.byteLength / 16000) * 1000)
        return generateLipsyncWithHedra(imageBuffer, imageFile, imageMimeType, audioBuffer, audioDurationMs)
      }

      async function runVeed(): Promise<Buffer> {
        const imageKey = await uploadToS3(imageBuffer, 'images', imageFile, imageMimeType)
        const imageUrl = await getPresignedUrl(imageKey, 3600)
        const audioFilename = `audio-${Date.now()}.mp3`
        const audioKey = await uploadToS3(audioBuffer, 'audio', audioFilename, 'audio/mpeg')
        const audioUrl = await getPresignedUrl(audioKey, 3600)

        const result = await fal.subscribe('veed/fabric-1.0', {
          input: { image_url: imageUrl, audio_url: audioUrl, resolution: '480p' },
        })
        const output = result.data as { video?: { url: string } }
        const url = output?.video?.url
        if (!url) throw new Error('No video returned from VEED')
        const videoRes = await fetch(url)
        return Buffer.from(await videoRes.arrayBuffer())
      }

      if (provider === 'hedra') {
        try {
          videoBuffer = await runHedra()
        } catch (hedraErr) {
          console.error(`[pipeline] Hedra failed for project ${projectId}, falling back to VEED:`, hedraErr)
          videoBuffer = await runVeed()
        }
      } else {
        try {
          videoBuffer = await runVeed()
        } catch (veedErr) {
          console.error(`[pipeline] VEED failed for project ${projectId}, falling back to Hedra:`, veedErr)
          videoBuffer = await runHedra()
        }
      }

      const videoKey = await uploadToS3(videoBuffer, 'lipsync', `lipsync-${Date.now()}.mp4`, 'video/mp4')
      lipsyncVideoUrl = getS3Url(videoKey)
      await updateProject(projectId, { lipsync_video_url: lipsyncVideoUrl })
    }

    // ── Stage: merge ──
    let mergedUrl: string
    if (project.merged_video_url) {
      mergedUrl = project.merged_video_url
    } else {
      if (!product_media_url || !product_media_type) throw new Error('Missing product media')

      const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-merge-'))
      const lipsyncPath = path.join(tmpDir, 'lipsync.mp4')
      const outputPath = path.join(tmpDir, 'merged.mp4')

      try {
        const lipsyncRes = await fetch(await toFetchableUrl(lipsyncVideoUrl))
        if (!lipsyncRes.ok) throw new Error('Failed to fetch lipsync video')
        await writeFile(lipsyncPath, Buffer.from(await lipsyncRes.arrayBuffer()))

        const productRes = await fetch(await toFetchableUrl(product_media_url))
        if (!productRes.ok) throw new Error('Failed to fetch product media')
        const contentType = productRes.headers.get('content-type')?.split(';')[0] ?? ''
        const ext = MIME_TO_EXT[contentType] ?? (product_media_type === 'video' ? 'mp4' : 'png')
        const productPath = path.join(tmpDir, `product.${ext}`)
        await writeFile(productPath, Buffer.from(await productRes.arrayBuffer()))

        await mergeVideo({ voiceover: lipsyncPath, product: productPath, output: outputPath })

        const key = await uploadToS3(await readFile(outputPath), 'merged', `merged_${Date.now()}.mp4`, 'video/mp4')
        mergedUrl = getS3Url(key)
        await updateProject(projectId, { merged_video_url: mergedUrl })
      } finally {
        const { readdir } = await import('fs/promises')
        const files = await readdir(tmpDir).catch(() => [] as string[])
        await Promise.allSettled(files.map((f) => unlink(path.join(tmpDir, f)).catch(() => { })))
      }
    }

    // ── Stage: caption ──
    let captionedUrl: string
    if (project.captioned_video_url) {
      captionedUrl = project.captioned_video_url
    } else {
      const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-caption-'))
      const inputPath = path.join(tmpDir, 'input.mp4')
      const outputPath = path.join(tmpDir, 'captioned.mp4')

      try {
        const res = await fetch(await toFetchableUrl(mergedUrl))
        if (!res.ok) throw new Error('Failed to fetch merged video')
        await writeFile(inputPath, Buffer.from(await res.arrayBuffer()))

        await captionVideo({ input: inputPath, output: outputPath, tmpDir })

        const key = await uploadToS3(await readFile(outputPath), 'merged', `captioned_${Date.now()}.mp4`, 'video/mp4')
        captionedUrl = getS3Url(key)
        await updateProject(projectId, { captioned_video_url: captionedUrl })
      } finally {
        await Promise.allSettled([
          unlink(inputPath).catch(() => { }),
          unlink(outputPath).catch(() => { }),
        ])
      }
    }

    // ── Stage: bgm ──
    if (project.final_video_url) return

    if (!music_url) {
      await updateProject(projectId, { final_video_url: captionedUrl, status: 'done' })
      await notifyUser(project.user_id, projectId)
      return
    }

    const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-bgm-'))
    const videoPath = path.join(tmpDir, 'input.mp4')
    const musicPath = path.join(tmpDir, 'music.mp3')
    const outputPath = path.join(tmpDir, 'output.mp4')

    try {
      const [videoRes, musicRes] = await Promise.all([
        fetch(await toFetchableUrl(captionedUrl)),
        fetch(music_url),
      ])
      if (!videoRes.ok) throw new Error('Failed to fetch captioned video')
      if (!musicRes.ok) throw new Error('Failed to fetch music')

      await Promise.all([
        writeFile(videoPath, Buffer.from(await videoRes.arrayBuffer())),
        writeFile(musicPath, Buffer.from(await musicRes.arrayBuffer())),
      ])

      await addBgm({ video: videoPath, music: musicPath, output: outputPath })

      const key = await uploadToS3(await readFile(outputPath), 'merged', `final_${Date.now()}.mp4`, 'video/mp4')
      await updateProject(projectId, { final_video_url: getS3Url(key), status: 'done' })
      await notifyUser(project.user_id, projectId)
    } finally {
      await Promise.allSettled([
        unlink(videoPath).catch(() => { }),
        unlink(musicPath).catch(() => { }),
        unlink(outputPath).catch(() => { }),
      ])
    }
  } catch (err) {
    console.error(`[pipeline] Project ${projectId} failed:`, err)
    await updateProject(projectId, { status: 'error' })
  }
}
