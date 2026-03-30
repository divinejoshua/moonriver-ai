import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

const USAGE_LIMIT = 20

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const isAdmin = clerkUser.publicMetadata?.admin === true
  const isPaid = clerkUser.publicMetadata?.paid === true

  if (isAdmin) {
    return Response.json({ isAdmin: true, paid: true, used: 0, limit: USAGE_LIMIT })
  }

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const used = count ?? 0
  return Response.json({ isAdmin: false, paid: isPaid, used, limit: USAGE_LIMIT })
}
