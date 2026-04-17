'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import Header from '@/app/components/Header'
import type { Project } from '@/lib/supabase'
import { AVATARS } from '@/lib/constants'

type StageStatus = 'pending' | 'active' | 'done' | 'error'

interface Stage {
  id: string
  label: string
  description: string
  status: StageStatus
}

const STAGE_DEFS = [
  { id: 'audio', label: 'Generating voiceover', description: 'Synthesising speech' },
  { id: 'lipsync', label: 'Generating lipsync', description: 'Adding lip sync to avatar' },
  { id: 'merge', label: 'Merging video', description: 'Combining product media with lipsync' },
  { id: 'caption', label: 'Adding captions', description: 'Burning voiceover script as captions' },
  { id: 'bgm', label: 'Adding background music', description: 'Mixing in background track at low volume' },
]

function deriveStages(project: Project): Stage[] {
  const {
    status,
    audio_url,
    lipsync_video_url,
    merged_video_url,
    captioned_video_url,
    final_video_url,
  } = project

  const completed = {
    audio: !!audio_url,
    lipsync: !!lipsync_video_url,
    merge: !!merged_video_url,
    caption: !!captioned_video_url,
    bgm: !!final_video_url || (status === 'done' && !project.music_url),
  }

  return STAGE_DEFS.map((def) => {
    const isDone = completed[def.id as keyof typeof completed]

    if (isDone) return { ...def, status: 'done' }

    if (status === 'done') return { ...def, status: 'done' }

    if (status === 'error') {
      // The first stage without a completed URL is the one that failed
      const anyPriorActive = Object.entries(completed).some(([id, done]) => {
        if (id === def.id) return false
        const priorIndex = STAGE_DEFS.findIndex((s) => s.id === id)
        const thisIndex = STAGE_DEFS.findIndex((s) => s.id === def.id)
        return priorIndex < thisIndex && !done
      })
      if (!anyPriorActive) return { ...def, status: 'error' }
      return { ...def, status: 'pending' }
    }

    // status === 'generating': first incomplete stage is active, rest pending
    const priorAllDone = STAGE_DEFS.slice(
      0,
      STAGE_DEFS.findIndex((s) => s.id === def.id),
    ).every((s) => completed[s.id as keyof typeof completed])

    return { ...def, status: priorAllDone ? 'active' : 'pending' }
  })
}

const POLL_INTERVAL = 3000

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>(STAGE_DEFS.map((d) => ({ ...d, status: 'pending' })))
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks whether we've already auto-retried this page load — resets on every refresh
  const hasRetriedRef = useRef(false)

  async function resumePipeline() {
    // Reset status to 'generating' — completed stage URLs are kept so the
    // pipeline resumes from the failed stage rather than starting over.
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'generating' }),
    })
    await fetch(`/api/projects/${id}/generate`, { method: 'POST' })
  }

  async function poll() {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) return
      const data: Project & { error?: string } = await res.json()
      if (data.error) { router.replace('/'); return }

      setProject(data)
      setStages(deriveStages(data))

      if (data.status === 'done') {
        setFinalVideoUrl(data.final_video_url)
        return
      }

      if (data.status === 'error') {
        // Auto-resume once per page load. A refresh gives a fresh chance to retry.
        if (!hasRetriedRef.current) {
          hasRetriedRef.current = true
          await resumePipeline()
          pollRef.current = setTimeout(poll, POLL_INTERVAL)
        }
        return
      }

      pollRef.current = setTimeout(poll, POLL_INTERVAL)
    } catch {
      pollRef.current = setTimeout(poll, POLL_INTERVAL)
    }
  }

  useEffect(() => {
    poll()
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allDone = project?.status === 'done'
  const hasError = project?.status === 'error'
  const isInProgress = !allDone && !hasError
  const avatar = AVATARS[project?.selected_avatar ?? 0]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header sticky>
        <UserButton />
      </Header>

      <main className="flex-1 overflow-y-auto py-12 px-4">
        <div className="max-w-lg mx-auto space-y-6">

          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {allDone ? 'Your video is ready' : hasError ? 'Something went wrong' : 'Creating your video…'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {allDone
                ? 'Your UGC video is ready below.'
                : hasError
                  ? 'One or more stages failed. Go back and try again.'
                  : 'This is running in the background — Videos can take from 1 - 5 Minutes'}
            </p>
          </div>

          {/* Warning */}
          {isInProgress && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-amber-800">
                Do not close or refresh this page while your video is being generated. You may lose progress.
              </p>
            </div>
          )}

          {/* Final video */}
          {finalVideoUrl && (
            <div className="bg-card border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Final Video</p>
                  <p className="text-xs text-muted-foreground">Product media · Ready to post</p>
                </div>
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = `/api/download?url=${encodeURIComponent(finalVideoUrl)}&filename=moonriver_ugc.mp4`
                    a.click()
                  }}
                  className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Download
                </button>
              </div>
              <video controls src={finalVideoUrl} className="w-48 rounded-xl mx-auto block border" />
            </div>
          )}

          {/* Action buttons */}
          {finalVideoUrl && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = `/api/download?url=${encodeURIComponent(finalVideoUrl)}&filename=moonriver_ugc.mp4`
                  a.click()
                }}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download video
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                Create another video
              </Link>
            </div>
          )}

          {/* Stage list */}
          <div className="bg-card border border-border rounded-2xl divide-y divide-border shadow-sm overflow-hidden">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-4 px-5 py-4">
                <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                  {stage.status === 'done' && (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {stage.status === 'active' && (
                    <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                  {stage.status === 'pending' && (
                    <div className="w-7 h-7 rounded-full border-2 border-border" />
                  )}
                  {stage.status === 'error' && (
                    <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${stage.status === 'pending' ? 'text-muted-foreground' :
                    stage.status === 'error' ? 'text-destructive' : 'text-foreground'
                    }`}>
                    {stage.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${stage.status === 'pending' ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    }`}>
                    {stage.description}
                  </p>
                </div>

                <div className="shrink-0">
                  {stage.status === 'active' && (
                    <span className="text-xs font-medium text-accent-foreground bg-accent px-2 py-0.5 rounded-full">
                      In progress
                    </span>
                  )}
                  {stage.status === 'done' && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                  {stage.status === 'error' && (
                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="h-8" />
        </div>
      </main>
    </div>
  )
}
