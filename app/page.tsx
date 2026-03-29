'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk, SignInButton, UserButton } from '@clerk/nextjs'
import Header from './components/Header'

type Step = 'input' | 'generating'

const PENDING_URL_KEY = 'moonriver_pending_url'

const TESTIMONIALS = [
  {
    name: 'Jamie L.',
    role: 'Shopify Store Owner',
    initials: 'JL',
    body: 'Posted the first video on TikTok and got 45k views in 48 hours. Moonriver saves me hours every single week.',
  },
  {
    name: 'Marcus D.',
    role: 'DTC Brand Founder',
    initials: 'MD',
    body: "Finally stopped paying for expensive UGC creators. The AI scripts are surprisingly natural — and the avatar delivery actually converts.",
  },
  {
    name: 'Priya K.',
    role: 'Instagram Creator',
    initials: 'PK',
    body: "Been using it for two weeks. Already have 3 videos over 10k views each. It's simple, fast, and it works.",
  },
]

const FAQS = [
  {
    q: 'What products work best with Moonriver?',
    a: 'Any product with a public URL — Shopify stores, Amazon listings, DTC landing pages, apps, and SaaS products. If it has a webpage, Moonriver can turn it into a video.',
  },
  {
    q: 'How long does video generation take?',
    a: 'Script generation takes about 10 seconds. The full video with lip-sync, captions, and music is usually ready in 2–4 minutes.',
  },
  {
    q: 'Can I edit the script before generating?',
    a: 'Yes — after the script is generated you land on the editor where you can rewrite it, pick a different avatar, change the music, and upload your own product media before creating the video.',
  },
  {
    q: 'What format does the video export in?',
    a: 'MP4, 9:16 vertical format — ready to post directly to TikTok, Instagram Reels, or YouTube Shorts.',
  },
  {
    q: 'Do I need any video editing skills?',
    a: 'None at all. You paste a URL, tweak the script if you want, and click generate. Captions are burned in automatically.',
  },
  {
    q: 'How many videos do I get?',
    a: 'The one-time purchase includes 20 videos with no monthly fees. Need more? Additional packs are available from your dashboard.',
  },
]

const FAQ_LD_JSON = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function Home() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const { openSignIn } = useClerk()
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; isAdmin: boolean } | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const didAutoGenerate = useRef(false)

  // Restore URL typed before sign-in
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_URL_KEY)
    if (pending) setUrl(pending)
  }, [])

  // Fetch usage once signed in
  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data) })
      .catch(() => { })
  }, [isSignedIn])

  // Auto-generate after sign-in if the user had typed a URL
  useEffect(() => {
    if (!isLoaded || !isSignedIn || didAutoGenerate.current) return
    const pending = sessionStorage.getItem(PENDING_URL_KEY)
    if (!pending) return
    didAutoGenerate.current = true
    sessionStorage.removeItem(PENDING_URL_KEY)
    setUrl(pending)
    handleGenerate(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  const URL_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/

  function stripProtocol(value: string) {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./i, 'www.')
  }

  function handleUrlChange(value: string) {
    setUrl(stripProtocol(value))
    setUrlError(null)
  }

  function validateUrl(raw: string): boolean {
    if (!raw.trim()) {
      setUrlError('Please enter a URL')
      return false
    }
    if (!URL_REGEX.test(raw.trim())) {
      setUrlError('Please enter a valid website (e.g. yourproduct.com)')
      return false
    }
    return true
  }

  function handleUnauthenticatedGenerate() {
    const stripped = stripProtocol(url)
    if (!validateUrl(stripped)) return
    sessionStorage.setItem(PENDING_URL_KEY, stripped)
  }

  async function handleGenerate(urlOverride?: string) {
    const raw = (urlOverride ?? url).trim()
    if (!validateUrl(raw)) return
    setError(null)
    setStep('generating')
    const target = `https://${raw}`
    try {
      const [scriptRes, screenshotRes] = await Promise.all([
        fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target }),
        }),
        fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target }),
        }),
      ])

      const scriptData = await scriptRes.json()
      if (!scriptRes.ok) throw new Error(scriptData.error ?? 'Failed to generate script')

      const screenshotData = screenshotRes.ok ? await screenshotRes.json() : null

      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          script: scriptData.script,
          product_media_url: screenshotData?.url ?? null,
          product_media_type: screenshotData?.url ? 'image' : null,
        }),
      })
      const projectData = await projectRes.json()
      if (projectRes.status === 403 && projectData.limitReached) {
        throw new Error(projectData.error)
      }
      if (!projectRes.ok) throw new Error(projectData.error ?? 'Failed to create project')

      setUsage((prev) => prev && !prev.isAdmin ? { ...prev, used: prev.used + 1 } : prev)
      router.push(`/projects/${projectData.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('input')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD_JSON) }}
      />

      <Header sticky>
        {isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </SignInButton>
        )}
      </Header>

      {/* ── HERO ── */}
      {step === 'input' && (
        <>
          <section className="flex flex-col items-center justify-center px-4 py-24 min-h-[calc(100svh-65px)]">
            <div className="w-full max-w-2xl space-y-8 text-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-accent border border-primary/30 text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  AI-powered UGC video generator
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  Create Viral UGC Videos <br className="hidden sm:block" /> in minutes
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                  Paste your product link. Get a review script, AI avatar voiceover, captions, and a ready-to-post video — in under 5 minutes.
                </p>
              </div>

              {/* Inline social proof */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">100K+</span>
                  <span className="text-muted-foreground">views generated</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">500+</span>
                  <span className="text-muted-foreground">videos created</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">9:16</span>
                  <span className="text-muted-foreground">TikTok-ready</span>
                </div>
              </div>

              {/* URL input */}
              <div className="flex gap-2.5">
                <div className={`flex flex-1 items-center bg-card border rounded-xl shadow-sm overflow-hidden focus-within:ring-1 focus-within:border-ring focus-within:ring-ring ${urlError ? 'border-destructive' : 'border-border'}`}>
                  <span className="pl-4 pr-2 text-sm text-muted-foreground select-none whitespace-nowrap">https://</span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      if (isSignedIn) {
                        handleGenerate()
                      } else {
                        handleUnauthenticatedGenerate()
                        openSignIn()
                      }
                    }}
                    placeholder="yourproduct.com"
                    className="flex-1 bg-transparent py-3.5 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                  />
                </div>
                {isSignedIn ? (
                  <button
                    onClick={() => handleGenerate()}
                    className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
                  >
                    Generate
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button
                      onClick={handleUnauthenticatedGenerate}
                      className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </SignInButton>
                )}
              </div>

              {(urlError || error) && (
                <p className="text-xs text-destructive text-center">{urlError ?? error}</p>
              )}

              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xs text-muted-foreground">
                  Works with Shopify, Amazon, landing pages, and more
                </p>
                {usage && !usage.isAdmin && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.max(usage.limit - usage.used, 0)} of {usage.limit} videos remaining
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── VIDEO SHOWCASE ── */}
          <section className="border-t border-border px-4 py-20">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-foreground">Videos made with Moonriver</h2>
                <p className="text-muted-foreground text-sm mt-2">Real UGC videos generated on this platform</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative bg-muted border border-border rounded-2xl overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                  >
                    {/* Placeholder — replace with <video> or embed when links are ready */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="border-t border-border bg-muted/40 px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-foreground">How it works</h2>
                <p className="text-muted-foreground text-sm mt-2">From URL to ready-to-post video in three steps</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    n: '1',
                    title: 'Paste your product URL',
                    desc: 'Drop in any Shopify, Amazon, or product landing page link. We scrape the page and extract the key details automatically.',
                  },
                  {
                    n: '2',
                    title: 'Customize your video',
                    desc: 'Review the AI-generated script, pick an avatar, choose background music, and upload your own product images or demo clips.',
                  },
                  {
                    n: '3',
                    title: 'Download & post',
                    desc: 'Your 9:16 vertical video with burned-in captions is ready to post on TikTok, Instagram Reels, or YouTube Shorts.',
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                      {n}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          <section className="px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-foreground">Creators love Moonriver</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Over 100,000 views generated from videos made on this platform
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {TESTIMONIALS.map(({ name, role, initials, body }) => (
                  <div key={name} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-foreground text-sm leading-relaxed flex-1">"{body}"</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="border-t border-border bg-muted/40 px-4 py-20">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-foreground">Frequently asked questions</h2>
              </div>
              <div className="space-y-2">
                {FAQS.map(({ q, a }, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                    >
                      <span className="font-medium text-sm text-foreground">{q}</span>
                      <span
                        className="text-muted-foreground text-lg leading-none shrink-0 transition-transform duration-200"
                        style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}
                      >
                        +
                      </span>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 pt-3 text-sm text-muted-foreground leading-relaxed border-t border-border">
                        {a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FOOTER CTA ── */}
          <section className="px-4 py-20 text-center">
            <div className="max-w-xl mx-auto space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Ready to go viral?</h2>
              <p className="text-muted-foreground text-sm">
                Paste your product URL above and generate your first video in under 5 minutes.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Try it now →
              </button>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="border-t border-border px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Moonriver</span>
            <span>AI UGC Video Generator</span>
          </footer>
        </>
      )}

      {/* ── GENERATING SPINNER ── */}
      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-foreground font-medium">Setting up your project…</p>
            <p className="text-muted-foreground text-sm">Scraping product page and writing your script</p>
          </div>
        </div>
      )}
    </div>
  )
}
