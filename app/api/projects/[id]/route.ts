import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { extractS3Key, getPresignedUrl } from '@/lib/s3'

// Fields that store plain S3 URLs — freshened to presigned URLs before returning to clients
const S3_URL_FIELDS = [
  'product_media_url',
  'lipsync_video_url',
  'merged_video_url',
  'captioned_video_url',
  'final_video_url',
] as const

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(await freshenUrls(data))
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates = await req.json()

  const { error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
