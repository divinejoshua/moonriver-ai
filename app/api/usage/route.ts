import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { userId, has } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const isAdmin = clerkUser.publicMetadata?.admin === true

  if (isAdmin) {
    return Response.json({ isAdmin: true, paid: true, used: 0, limit: 25 })
  }

  const hasGrowth = has({ plan: 'growth' })
  const hasBasic = has({ plan: 'basic' })
  // Legacy: users who paid via Stripe before subscriptions were introduced
  const paidCount = (clerkUser.publicMetadata?.paidCount as number) ?? 0

  let limit: number
  let isPaid: boolean
  if (hasGrowth) {
    limit = 25
    isPaid = true
  } else if (hasBasic) {
    limit = 5
    isPaid = true
  } else if (paidCount > 0) {
    limit = paidCount * 5
    isPaid = true
  } else {
    limit = 1
    isPaid = false
  }

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const used = count ?? 0
  return Response.json({ isAdmin: false, paid: isPaid, used, limit })
}
