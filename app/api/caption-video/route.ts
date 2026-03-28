import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { uploadToS3, getS3Url } from '@/lib/s3'
import { captionVideo } from '@/lib/caption-video'

export const maxDuration = 300

export async function POST(req: Request) {
  const { videoUrl } = await req.json() as { videoUrl: string }

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 })
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-'))
  const inputPath = path.join(tmpDir, 'input.mp4')
  const outputPath = path.join(tmpDir, 'captioned.mp4')

  try {
    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`)
    await writeFile(inputPath, Buffer.from(await res.arrayBuffer()))

    await captionVideo({ input: inputPath, output: outputPath, tmpDir })

    const filename = `captioned_${Date.now()}.mp4`
    const key = await uploadToS3(await readFile(outputPath), 'merged', filename, 'video/mp4')
    const captionedVideoUrl = getS3Url(key)

    return NextResponse.json({ captionedVideoUrl })
  } finally {
    await Promise.allSettled([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}
