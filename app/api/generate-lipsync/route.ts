import { fal } from '@fal-ai/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { uploadToS3, getPresignedUrl, getS3Url } from '@/lib/s3'

export const maxDuration = 120

fal.config({ credentials: process.env.FAL_API_KEY })

const AVATAR_IMAGE_FILES: Record<number, string> = {
  0: 'one.png',
  1: 'two.png',
  2: 'three.png',
}

export async function POST(request: Request) {
  const { audioBase64, avatarId } = await request.json()

  if (!audioBase64 || avatarId === undefined) {
    return Response.json({ error: 'Missing audioBase64 or avatarId' }, { status: 400 })
  }

  const imageFile = AVATAR_IMAGE_FILES[avatarId as number]
  if (!imageFile) {
    return Response.json({ error: 'Invalid avatarId' }, { status: 400 })
  }

  // Upload avatar image to S3 images/
  const imagePath = join(process.cwd(), 'public', 'avatars', imageFile)
  const imageBuffer = readFileSync(imagePath)
  const imageKey = await uploadToS3(imageBuffer, 'images', imageFile, 'image/png')
  const imageUrl = await getPresignedUrl(imageKey, 3600)

  // Decode audio base64 data URI and upload to S3 audio/
  const audioBase64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '')
  const audioBuffer = Buffer.from(audioBase64Data, 'base64')
  const audioFilename = `audio-${Date.now()}.mp3`
  const audioKey = await uploadToS3(audioBuffer, 'audio', audioFilename, 'audio/mpeg')
  const audioUrl = await getPresignedUrl(audioKey, 3600)

  // Call VEED Fabric 1.0 with real S3 URLs
  const result = await fal.subscribe('veed/fabric-1.0', {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      resolution: '480p',
    },
  })

  const output = result.data as { video?: { url: string } }
  const lipsyncVideoUrl = output?.video?.url

  if (!lipsyncVideoUrl) {
    return Response.json({ error: 'No video returned from VEED' }, { status: 500 })
  }

  // Download the VEED video and store it in S3 lipsync/
  const videoRes = await fetch(lipsyncVideoUrl)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  const videoFilename = `lipsync-${Date.now()}.mp4`
  const videoKey = await uploadToS3(videoBuffer, 'lipsync', videoFilename, 'video/mp4')
  const videoUrl = getS3Url(videoKey)

  return Response.json({ videoUrl })
}
