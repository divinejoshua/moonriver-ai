import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { runPipeline } from '@/lib/pipeline'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, has } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Check subscription and enforce limits
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const isAdmin = clerkUser.publicMetadata?.admin === true

  if (!isAdmin) {
    const hasGrowth = has({ plan: 'growth' })
    const hasBasic = has({ plan: 'basic' })
    const paidCount = (clerkUser.publicMetadata?.paidCount as number) ?? 0

    if (!hasGrowth && !hasBasic && paidCount === 0) {
      return Response.json({ error: 'Subscription required', notPaid: true }, { status: 403 })
    }

    let effectiveLimit: number
    if (hasGrowth) effectiveLimit = 25
    else if (hasBasic) effectiveLimit = 5
    else effectiveLimit = paidCount * 5

    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) > effectiveLimit) {
      return Response.json(
        { error: `You've reached your ${effectiveLimit} video limit.`, limitReached: true },
        { status: 403 },
      )
    }
  }

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
