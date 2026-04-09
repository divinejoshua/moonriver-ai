import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { runPipeline } from '@/lib/pipeline'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  if (!project.script || !project.product_media_url) {
    return Response.json({ error: 'Project is missing required fields' }, { status: 400 })
  }

  // Fire and forget — Railway's persistent server keeps the event loop alive
  void runPipeline(id, project)

  return Response.json({ ok: true })
}
