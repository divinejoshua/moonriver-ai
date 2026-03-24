import { NextResponse } from 'next/server'
import { uploadToS3 } from '@/lib/s3'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `product_${Date.now()}.${ext}`
  const folder = file.type.startsWith('video/') ? 'product-videos' : 'product-images'

  const url = await uploadToS3(buffer, folder as 'images', filename, file.type)

  return NextResponse.json({ url })
}
