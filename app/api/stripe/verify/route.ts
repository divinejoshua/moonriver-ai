import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 })

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid' || session.metadata?.userId !== userId) {
    return Response.json({ error: 'Payment not confirmed' }, { status: 402 })
  }

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  await clerk.users.updateUser(userId, {
    publicMetadata: { ...user.publicMetadata, paid: true },
  })

  return Response.json({ ok: true })
}
