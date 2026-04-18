import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { runPipeline } from '@/lib/pipeline'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const caller = await clerk.users.getUser(userId)
  if (caller.publicMetadata?.admin !== true) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await req.json().catch(() => ({}))
  if (!projectId || typeof projectId !== 'string') {
    return Response.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  if (!project.script || !project.product_media_url) {
    return Response.json({ error: 'Project is missing required fields' }, { status: 400 })
  }

  await supabase
    .from('projects')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', projectId)

  // Resume from the last failed stage — runPipeline skips any stage whose URL is already set.
  void runPipeline(projectId, { ...project, status: 'generating' })

  return Response.json({ ok: true })
}
