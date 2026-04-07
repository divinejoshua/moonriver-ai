'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, UserButton } from '@clerk/nextjs'
import Footer from '../components/Footer'
import Header from '../components/Header'

function PricingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get('session_id')
  const canceled = searchParams.get('canceled') === 'true'

  // Verify payment with Stripe directly, then go home
  useEffect(() => {
    if (!sessionId || !isSignedIn) return
    fetch('/api/stripe/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) router.replace('/')
        else setError('Payment could not be confirmed. Please contact support.')
      })
      .catch(() => setError('Something went wrong. Please contact support.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isSignedIn])

  async function handlePay() {
    if (!isSignedIn) {
      router.push('/sign-in?redirect_url=/pricing')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (sessionId) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Payment confirmed!</p>
          <p className="text-sm text-muted-foreground">Redirecting you now…</p>
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header><UserButton /></Header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Price header */}
            <div className="px-6 pt-8 pb-6 border-b border-border text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Starter Pack</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">$79</span>
              </div>
              <p className="text-sm text-muted-foreground">one-time · no subscription</p>
            </div>

            {/* Feature list */}
            <div className="px-6 py-6 space-y-3">
              {[
                '10 AI-generated UGC videos',
                'Avatar lip-sync voiceovers',
                '100+ intro and outro hooks',
                'Auto-captions & background music',
                'Download in full quality',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 text-primary-foreground font-semibold py-3.5 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Redirecting…' : 'Get started'}
              </button>

              {canceled && (
                <p className="text-xs text-muted-foreground text-center">Payment canceled. You can try again whenever you're ready.</p>
              )}
              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Secure payment via Stripe
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingPageInner />
    </Suspense>
  )
}
