'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Header from '@/app/components/Header'
import type { Project } from '@/lib/supabase'
import { AVATARS, AVATAR_VOICE_MAP } from '@/lib/constants'

type StageStatus = 'pending' | 'active' | 'done' | 'error'

interface Stage {
  id: string
  label: string
  description: string
  status: StageStatus
}

const INITIAL_STAGES: Stage[] = [
  { id: 'audio', label: 'Generating voiceover', description: 'Synthesising speech', status: 'pending' },
  { id: 'lipsync', label: 'Generating lipsync', description: 'Adding lip sync to avatar', status: 'pending' },
  { id: 'merge', label: 'Merging video', description: 'Combining product media with lipsync', status: 'pending' },
  { id: 'caption', label: 'Adding captions', description: 'Burning voiceover script as captions', status: 'pending' },
  { id: 'bgm', label: 'Adding background music', description: 'Mixing in background track at low volume', status: 'pending' },
]

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const hasStarted = useRef(false)

  function setStageStatus(stageId: string, status: StageStatus) {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, status } : s)))
  }

  async function saveProject(updates: Partial<Project>) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  async function fetchPresignedFinalUrl(): Promise<string | null> {
    const res = await fetch(`/api/projects/${id}`)
    const data = await res.json()
    return data.final_video_url ?? null
  }

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data: Project & { error?: string }) => {
        if (data.error || !data.script || !data.product_media_url) {
          router.replace('/')
          return
        }
        setProject(data)
        if (data.final_video_url) {
          setStages(INITIAL_STAGES.map((s) => ({ ...s, status: 'done' })))
          setFinalVideoUrl(data.final_video_url)
          return
        }
        run(data)
      })
      .catch(() => router.replace('/'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const devDelay = () => new Promise((resolve) => setTimeout(resolve, 2000))

  async function run(p: Project) {
    const { script, selected_avatar, product_media_url, product_media_type, music_url } = p

    // ── Stage: audio + lipsync ──
    // If lipsync is already done, skip both audio and lipsync entirely.
    let lipsyncVideoUrl: string | null = p.lipsync_video_url ?? null
    if (lipsyncVideoUrl) {
      setStageStatus('audio', 'done')
      setStageStatus('lipsync', 'done')
    } else {
      // Generate audio
      setStageStatus('audio', 'active')
      let audioDataUri: string | null = null
      try {
        const devAudioUrl = process.env.NEXT_PUBLIC_DEV_AUDIO_URL
        if (devAudioUrl) {
          const res = await fetch(devAudioUrl)
          if (!res.ok) throw new Error('Failed to fetch dev audio')
          const blob = await res.blob()
          const arrayBuffer = await blob.arrayBuffer()
          const uint8 = new Uint8Array(arrayBuffer)
          let binary = ''
          uint8.forEach((b) => { binary += String.fromCharCode(b) })
          audioDataUri = `data:audio/mpeg;base64,${btoa(binary)}`
          await devDelay()
        } else {
          const voiceId = AVATAR_VOICE_MAP[selected_avatar]
          const res = await fetch('/api/generate-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script, voiceId }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Failed to generate audio')
          }
          const blob = await res.blob()
          const arrayBuffer = await blob.arrayBuffer()
          const uint8 = new Uint8Array(arrayBuffer)
          let binary = ''
          uint8.forEach((b) => { binary += String.fromCharCode(b) })
          audioDataUri = `data:audio/mpeg;base64,${btoa(binary)}`
        }
        setStageStatus('audio', 'done')
      } catch (err) {
        setStageStatus('audio', 'error')
        setError(err instanceof Error ? err.message : 'Audio generation failed')
        await saveProject({ status: 'error' })
        return
      }

      // Generate lipsync
      setStageStatus('lipsync', 'active')
      try {
        const devLipsyncUrl = process.env.NEXT_PUBLIC_DEV_LIPSYNC_URL
        if (devLipsyncUrl) {
          lipsyncVideoUrl = devLipsyncUrl
          await devDelay()
        } else {
          const res = await fetch('/api/generate-lipsync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: audioDataUri, avatarId: selected_avatar }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Failed to generate lipsync')
          }
          const data = await res.json()
          lipsyncVideoUrl = data.videoUrl
        }
        await saveProject({ lipsync_video_url: lipsyncVideoUrl })
        setStageStatus('lipsync', 'done')
      } catch (err) {
        setStageStatus('lipsync', 'error')
        setError(err instanceof Error ? err.message : 'Lipsync generation failed')
        await saveProject({ status: 'error' })
        return
      }
    }

    // ── Stage: merge ──
    let mergedUrl: string | null = p.merged_video_url ?? null
    if (mergedUrl) {
      setStageStatus('merge', 'done')
    } else {
      const devCaptionedUrl = process.env.NEXT_PUBLIC_DEV_CAPTIONED_URL
      if (devCaptionedUrl) {
        setStageStatus('merge', 'active')
        await devDelay()
        setStageStatus('merge', 'done')
        mergedUrl = devCaptionedUrl
      } else {
        setStageStatus('merge', 'active')
        try {
          const res = await fetch('/api/merge-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lipsyncVideoUrl, productMediaUrl: product_media_url, productMediaType: product_media_type }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Failed to merge video')
          }
          const data = await res.json()
          mergedUrl = data.mergedVideoUrl
          await saveProject({ merged_video_url: mergedUrl })
          setStageStatus('merge', 'done')
        } catch (err) {
          setStageStatus('merge', 'error')
          setError(err instanceof Error ? err.message : 'Video merge failed')
          await saveProject({ status: 'error' })
          return
        }
      }
    }

    // ── Stage: caption ──
    let captionedUrl: string | null = p.captioned_video_url ?? null
    if (captionedUrl) {
      setStageStatus('caption', 'done')
    } else {
      const devCaptionedUrl = process.env.NEXT_PUBLIC_DEV_CAPTIONED_URL
      if (devCaptionedUrl) {
        setStageStatus('caption', 'active')
        await devDelay()
        captionedUrl = devCaptionedUrl
        await saveProject({ captioned_video_url: captionedUrl })
        setStageStatus('caption', 'done')
      } else {
        setStageStatus('caption', 'active')
        try {
          const res = await fetch('/api/caption-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: mergedUrl }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Failed to add captions')
          }
          const data = await res.json()
          captionedUrl = data.captionedVideoUrl
          await saveProject({ captioned_video_url: captionedUrl })
          setStageStatus('caption', 'done')
        } catch (err) {
          setStageStatus('caption', 'error')
          setError(err instanceof Error ? err.message : 'Caption generation failed')
          await saveProject({ status: 'error' })
          return
        }
      }
    }

    // ── Stage: bgm ──
    const devBgmUrl = process.env.NEXT_PUBLIC_DEV_BGM_URL
    if (devBgmUrl) {
      setStageStatus('bgm', 'active')
      await devDelay()
      setStageStatus('bgm', 'done')
      await saveProject({ final_video_url: devBgmUrl, status: 'done' })
      setFinalVideoUrl(await fetchPresignedFinalUrl())
      return
    }
    if (!music_url) {
      setStageStatus('bgm', 'done')
      await saveProject({ final_video_url: captionedUrl, status: 'done' })
      setFinalVideoUrl(await fetchPresignedFinalUrl())
      return
    }
    setStageStatus('bgm', 'active')
    try {
      const res = await fetch('/api/add-bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: captionedUrl, musicUrl: music_url }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add background music')
      }
      const data = await res.json()
      await saveProject({ final_video_url: data.finalVideoUrl, status: 'done' })
      setFinalVideoUrl(await fetchPresignedFinalUrl())
      setStageStatus('bgm', 'done')
    } catch (err) {
      setStageStatus('bgm', 'error')
      setError(err instanceof Error ? err.message : 'Background music failed')
      await saveProject({ status: 'error' })
    }
  }

  const allDone = stages.every((s) => s.status === 'done')
  const hasError = stages.some((s) => s.status === 'error')
  const isInProgress = !allDone && !hasError
  const avatar = AVATARS[project?.selected_avatar ?? 0]

  useEffect(() => {
    if (!isInProgress) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isInProgress])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header sticky>
        <UserButton />
      </Header>

      {/* Scrollable content */}
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
                  : 'Sit tight while we build each asset.'}
            </p>
          </div>

          {/* Do-not-close warning */}
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

          {/* Final video — shown above stages when ready */}
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
                  <p className="text-xs text-muted-foreground">Product media + {avatar.name} · Ready to post</p>
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
                  <p className={`text-sm font-medium ${
                    stage.status === 'pending' ? 'text-muted-foreground' :
                    stage.status === 'error' ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {stage.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    stage.status === 'pending' ? 'text-muted-foreground/50' : 'text-muted-foreground'
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

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <div className="h-8" />
        </div>
      </main>
    </div>
  )
}
