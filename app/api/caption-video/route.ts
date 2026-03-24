import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { uploadToS3 } from '@/lib/s3'
import { captionVideo } from '@/lib/caption-video'

export const maxDuration = 120

export async function POST(req: Request) {
  const { videoUrl, script } = await req.json() as {
    videoUrl: string
    script: string
  }

  if (!videoUrl || !script) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-'))
  const inputPath = path.join(tmpDir, 'input.mp4')
  const outputPath = path.join(tmpDir, 'captioned.mp4')

  try {
    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`)
    await writeFile(inputPath, Buffer.from(await res.arrayBuffer()))

    await captionVideo({ input: inputPath, output: outputPath, script, tmpDir })

    const filename = `captioned_${Date.now()}.mp4`
    const captionedVideoUrl = await uploadToS3(await readFile(outputPath), 'merged', filename, 'video/mp4')

    return NextResponse.json({ captionedVideoUrl })
  } finally {
    await Promise.allSettled([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}
