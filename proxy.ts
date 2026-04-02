import { clerkMiddleware, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/pricing', '/api/stripe/webhook', '/api/stripe/checkout', '/api/stripe/verify']

export const proxy = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  if (!userId) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const isPaid = user.publicMetadata?.paid === true
  const isAdmin = user.publicMetadata?.admin === true

  if (!isPaid && !isAdmin) {
    return NextResponse.redirect(new URL('/pricing', request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)',
  ],
}
