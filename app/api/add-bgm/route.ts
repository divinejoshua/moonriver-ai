import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { uploadToS3, getS3Url } from '@/lib/s3'
import { addBgm } from '@/lib/add-bgm'

export const maxDuration = 120

export async function POST(req: Request) {
  const { videoUrl, musicUrl } = await req.json() as { videoUrl: string; musicUrl: string }

  if (!videoUrl || !musicUrl) {
    return NextResponse.json({ error: 'Missing videoUrl or musicUrl' }, { status: 400 })
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-bgm-'))
  const videoPath = path.join(tmpDir, 'input.mp4')
  const musicPath = path.join(tmpDir, 'music.mp3')
  const outputPath = path.join(tmpDir, 'output.mp4')

  try {
    const [videoRes, musicRes] = await Promise.all([fetch(videoUrl), fetch(musicUrl)])
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`)
    if (!musicRes.ok) throw new Error(`Failed to download music: ${musicRes.status}`)

    await Promise.all([
      writeFile(videoPath, Buffer.from(await videoRes.arrayBuffer())),
      writeFile(musicPath, Buffer.from(await musicRes.arrayBuffer())),
    ])

    await addBgm({ video: videoPath, music: musicPath, output: outputPath })

    const filename = `final_${Date.now()}.mp4`
    const key = await uploadToS3(await readFile(outputPath), 'merged', filename, 'video/mp4')
    const finalVideoUrl = getS3Url(key)

    return NextResponse.json({ finalVideoUrl })
  } finally {
    await Promise.allSettled([
      unlink(videoPath).catch(() => {}),
      unlink(musicPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}
