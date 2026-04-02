import Link from 'next/link'
import Image from 'next/image'

const FEATURES = [
  '10 AI-generated UGC videos',
  'Avatar lip-sync voiceovers',
  '100+ intro and outro hooks',
  'Auto-captions & background music',
  'Download in full quality',
  'Any product URL — Shopify, Amazon, SaaS & more',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Moonriver" width={28} height={28} className="shrink-0" />
          <span className="font-semibold text-base tracking-tight text-foreground">Moonriver</span>
        </Link>
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-16">
        {/* Hero */}
        <div className="text-center space-y-3 max-w-lg mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Simple, honest pricing</h1>
          <p className="text-muted-foreground">
            One payment. No subscription. No monthly fees.
          </p>
        </div>

        {/* Pricing card */}
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="bg-primary px-6 py-8 text-center">
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest mb-2">
                Starter Pack
              </p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold text-primary-foreground">$79</span>
              </div>
              <p className="text-primary-foreground/70 text-sm mt-2">one-time payment</p>
            </div>

            {/* Features */}
            <div className="px-6 py-6 space-y-3">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 space-y-3">
              <Link
                href="/pay"
                className="block w-full bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold py-3.5 rounded-xl transition-colors text-sm text-center"
              >
                Get started — $79
              </Link>
              <p className="text-xs text-muted-foreground text-center">
                Secure payment via Stripe. One-time charge, no subscription.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ-style reassurance */}
        <div className="mt-12 max-w-sm w-full space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Need more videos? Additional packs are available from your dashboard after purchase.
          </p>
        </div>
      </main>
    </div>
  )
}
