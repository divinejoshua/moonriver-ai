'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, SignInButton, UserButton } from '@clerk/nextjs'
import Header from './components/Header'

type Step = 'input' | 'generating'

export default function Home() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; isAdmin: boolean } | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data) })
      .catch(() => {})
  }, [isSignedIn])

  const URL_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/

  function stripProtocol(value: string) {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./i, 'www.')
  }

  function handleUrlChange(value: string) {
    setUrl(stripProtocol(value))
    setUrlError(null)
  }

  function validateUrl(): boolean {
    if (!url.trim()) {
      setUrlError('Please enter a URL')
      return false
    }
    if (!URL_REGEX.test(url.trim())) {
      setUrlError('Please enter a valid website (e.g. yourproduct.com)')
      return false
    }
    return true
  }

  function fullUrl() {
    return `https://${url.trim()}`
  }

  async function handleGenerate() {
    if (!validateUrl()) return
    setError(null)
    setStep('generating')
    try {
      // Generate script and screenshot in parallel
      const [scriptRes, screenshotRes] = await Promise.all([
        fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fullUrl() }),
        }),
        fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fullUrl() }),
        }),
      ])

      const scriptData = await scriptRes.json()
      if (!scriptRes.ok) throw new Error(scriptData.error ?? 'Failed to generate script')

      // Screenshot is best-effort — don't fail if it errors
      const screenshotData = screenshotRes.ok ? await screenshotRes.json() : null

      // Create project in Supabase
      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl(),
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
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header>
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

      {/* URL input */}
      {step === 'input' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-2xl space-y-8 text-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-accent border border-primary/30 text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AI-powered UGC video generator
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Create Viral UGC Videos in minutes.
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
                Drop in your product URL and we'll generate a review script, avatar voiceover, and
                a ready-to-export video — in seconds.
              </p>
            </div>

            <div className="flex gap-2.5">
              <div className={`flex flex-1 items-center bg-card border rounded-xl shadow-sm overflow-hidden focus-within:ring-1 focus-within:border-ring focus-within:ring-ring ${urlError ? 'border-destructive' : 'border-border'}`}>
                <span className="pl-4 pr-2 text-sm text-muted-foreground select-none whitespace-nowrap">https://</span>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && isSignedIn && handleGenerate()}
                  placeholder="yourproduct.com"
                  className="flex-1 bg-transparent py-3.5 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>
              {isSignedIn ? (
                <button
                  onClick={handleGenerate}
                  className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
                >
                  Generate
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap">
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
        </div>
      )}

      {/* Generating script spinner */}
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
