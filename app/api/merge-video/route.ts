import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { uploadToS3, getPresignedUrl } from '@/lib/s3'
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
  const { lipsyncVideoUrl, productMediaUrl, productMediaType } = await req.json() as {
    lipsyncVideoUrl: string
    productMediaUrl: string
    productMediaType: 'image' | 'video'
  }

  if (!lipsyncVideoUrl || !productMediaUrl || !productMediaType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'moonriver-'))

  // Determine extension from the product URL's Content-Type or file extension
  async function downloadTo(url: string, destPath: string): Promise<string> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
    const contentType = res.headers.get('content-type')?.split(';')[0] ?? ''
    await writeFile(destPath, Buffer.from(await res.arrayBuffer()))
    return contentType
  }

  const lipsyncPath = path.join(tmpDir, 'lipsync.mp4')
  const outputPath = path.join(tmpDir, 'merged.mp4')

  try {
    await downloadTo(lipsyncVideoUrl, lipsyncPath)

    // Download product media — derive extension from content-type
    const tempProductPath = path.join(tmpDir, 'product_tmp')
    const contentType = await downloadTo(productMediaUrl, tempProductPath)
    const ext = MIME_TO_EXT[contentType] ?? (productMediaType === 'video' ? 'mp4' : 'png')
    const productPath = `${tempProductPath}.${ext}`
    const { rename } = await import('fs/promises')
    await rename(tempProductPath, productPath)

    await mergeVideo({ voiceover: lipsyncPath, product: productPath, output: outputPath })

    const filename = `merged_${Date.now()}.mp4`
    const key = await uploadToS3(await readFile(outputPath), 'merged', filename, 'video/mp4')
    const mergedVideoUrl = await getPresignedUrl(key)

    return NextResponse.json({ mergedVideoUrl })
  } finally {
    const { readdir } = await import('fs/promises')
    const files = await readdir(tmpDir).catch(() => [] as string[])
    await Promise.allSettled(files.map((f) => unlink(path.join(tmpDir, f)).catch(() => {})))
  }
}
