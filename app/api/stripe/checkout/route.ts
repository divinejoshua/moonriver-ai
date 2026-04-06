import { auth, clerkClient } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function createCheckoutSession(userId: string) {
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  return stripe.checkout.sessions.create({
    mode: 'payment',
    ...(email ? { customer_email: email } : {}),
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'ILoveUgc — 10 UGC Videos',
            description: 'One-time access to generate up to 10 AI-powered UGC videos.',
          },
          unit_amount: 7900,
        },
        quantity: 1,
      },
    ],
    metadata: { userId },
    success_url: `${appUrl}/pricing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
  })
}

// Called by the proxy — redirects straight to Stripe
export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!))

  const session = await createCheckoutSession(userId)
  return Response.redirect(session.url!)
}

// Kept for the /pricing page cancel flow (user clicks pay again after canceling)
export async function POST() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await createCheckoutSession(userId)
  return Response.json({ url: session.url })
}
