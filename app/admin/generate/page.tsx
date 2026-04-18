'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, UserButton } from '@clerk/nextjs'
import Header from '@/app/components/Header'

export default function AdminGeneratePage() {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()

  const [projectId, setProjectId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/')
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-border" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const isAdmin = user?.publicMetadata?.admin === true

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header>
          <UserButton />
        </Header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-2">
            <h1 className="text-lg font-semibold">Not authorized</h1>
            <p className="text-sm text-muted-foreground">This page is only accessible to admins.</p>
          </div>
        </main>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = projectId.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to restart generation')
      setSuccess(`Generation restarted for project ${trimmed}`)
      setProjectId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header>
        <UserButton />
      </Header>

      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Restart Generation</h1>
          <p className="text-sm text-muted-foreground">
            Paste a project ID to resume its pipeline from the last failed stage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="projectId" className="text-sm font-medium text-foreground">
              Project ID
            </label>
            <input
              id="projectId"
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g. 5b3d9a6e-..."
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground shadow-sm"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={!projectId.trim() || submitting}
            className={`text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              projectId.trim() && !submitting
                ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                : 'bg-primary/40 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Restarting…' : 'Restart generation'}
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-emerald-600">{success}</p>}
        </form>
      </main>
    </div>
  )
}
