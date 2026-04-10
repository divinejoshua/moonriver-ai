import { fal } from '@fal-ai/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { uploadToS3, getPresignedUrl, getS3Url } from '@/lib/s3'
import { AVATARS } from '@/lib/constants'
import { generateLipsyncWithHedra } from '@/lib/lipsync-hedra'

export const maxDuration = 300

fal.config({ credentials: process.env.FAL_API_KEY })

export async function POST(request: Request) {
  const { audioBase64, avatarId } = await request.json()

  if (!audioBase64 || avatarId === undefined) {
    return Response.json({ error: 'Missing audioBase64 or avatarId' }, { status: 400 })
  }

  const avatar = AVATARS.find((a) => a.id === avatarId)
  if (!avatar) {
    return Response.json({ error: 'Invalid avatarId' }, { status: 400 })
  }
  const imageFile = avatar.src.split('/').pop()!

  const imagePath = join(process.cwd(), 'public', 'avatars', imageFile)
  const imageBuffer = readFileSync(imagePath)
  const imageMimeType = imageFile.endsWith('.jpeg') || imageFile.endsWith('.jpg') ? 'image/jpeg' : 'image/png'

  const audioBase64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '')
  const audioBuffer = Buffer.from(audioBase64Data, 'base64')

  const provider = (process.env.LIPSYNC_PROVIDER ?? 'veed').toLowerCase()

  let videoBuffer: Buffer

  async function runHedra(): Promise<Buffer> {
    // Estimate audio duration from buffer size (rough: MP3 ~128kbps → 16000 bytes/sec)
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
      console.error('[generate-lipsync] Hedra failed, falling back to VEED:', hedraErr)
      videoBuffer = await runVeed()
    }
  } else {
    try {
      videoBuffer = await runVeed()
    } catch (veedErr) {
      console.error('[generate-lipsync] VEED failed, falling back to Hedra:', veedErr)
      videoBuffer = await runHedra()
    }
  }

  const videoFilename = `lipsync-${Date.now()}.mp4`
  const videoKey = await uploadToS3(videoBuffer, 'lipsync', videoFilename, 'video/mp4')
  const videoUrl = getS3Url(videoKey)

  return Response.json({ videoUrl })
}
