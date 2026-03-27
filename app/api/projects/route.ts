import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('id, url, status, selected_avatar, final_video_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, script } = await req.json()
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, url, script: script ?? null, status: 'draft' })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id })
}
