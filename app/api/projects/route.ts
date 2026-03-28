import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { extractS3Key, getPresignedUrl } from '@/lib/s3'

// Fields that store S3 object keys (or old pre-signed URLs that need normalising)
const S3_URL_FIELDS = [
  'product_media_url',
  'lipsync_video_url',
  'merged_video_url',
  'captioned_video_url',
  'final_video_url',
] as const

type S3Field = (typeof S3_URL_FIELDS)[number]

async function freshenUrls<T extends Record<string, unknown>>(row: T): Promise<T> {
  const result = { ...row }
  await Promise.all(
    S3_URL_FIELDS.map(async (field) => {
      const val = row[field]
      if (typeof val === 'string' && val) {
        const key = extractS3Key(val)
        ;(result as Record<string, unknown>)[field] = await getPresignedUrl(key)
      }
    }),
  )
  return result
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('id, url, status, selected_avatar, final_video_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const freshened = await Promise.all((data ?? []).map(freshenUrls))

  return Response.json(freshened)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { url, script, product_media_url, product_media_type } = body

  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  // Normalise to S3 key if a full pre-signed URL was passed
  const normalizedMediaUrl = product_media_url ? extractS3Key(product_media_url) : null

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      url,
      script: script ?? null,
      product_media_url: normalizedMediaUrl,
      product_media_type: product_media_type ?? null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id })
}
