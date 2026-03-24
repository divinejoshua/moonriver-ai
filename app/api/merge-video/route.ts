import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { uploadToS3 } from '@/lib/s3'
import { mergeVideo } from '@/lib/merge-video'

export const maxDuration = 120

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

export async function POST(req: Request) {
  const { lipsyncVideoUrl, productMediaBase64, productMediaType } = await req.json() as {
    lipsyncVideoUrl: string
    productMediaBase64: string
    productMediaType: 'image' | 'video'
  }

  if (!lipsyncVideoUrl || !productMediaBase64 || !productMediaType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Determine file extension from the data URI MIME type
  const mimeMatch = productMediaBase64.match(/^data:([^;]+);base64,/)
  const mimeType = mimeMatch?.[1] ?? (productMediaType === 'video' ? 'video/mp4' : 'image/png')
  const ext = MIME_TO_EXT[mimeType] ?? (productMediaType === 'video' ? 'mp4' : 'png')

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-'))
  const lipsyncPath = path.join(tmpDir, 'lipsync.mp4')
  const productPath = path.join(tmpDir, `product.${ext}`)
  const outputPath = path.join(tmpDir, 'merged.mp4')

  try {
    // Download lipsync video to temp file
    const lipsyncRes = await fetch(lipsyncVideoUrl)
    if (!lipsyncRes.ok) throw new Error(`Failed to download lipsync video: ${lipsyncRes.status}`)
    const lipsyncBuffer = Buffer.from(await lipsyncRes.arrayBuffer())
    await writeFile(lipsyncPath, lipsyncBuffer)

    // Write product media from base64 to temp file
    const base64Data = productMediaBase64.replace(/^data:[^;]+;base64,/, '')
    const productBuffer = Buffer.from(base64Data, 'base64')
    await writeFile(productPath, productBuffer)

    // Run merge
    await mergeVideo({ voiceover: lipsyncPath, product: productPath, output: outputPath })

    // Read merged output and upload to S3
    const mergedBuffer = await readFile(outputPath)
    const filename = `merged_${Date.now()}.mp4`
    const mergedVideoUrl = await uploadToS3(mergedBuffer, 'merged', filename, 'video/mp4')

    return NextResponse.json({ mergedVideoUrl })
  } finally {
    await Promise.allSettled([
      unlink(lipsyncPath).catch(() => {}),
      unlink(productPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}
