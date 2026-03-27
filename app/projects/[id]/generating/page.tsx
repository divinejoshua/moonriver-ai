'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import type { Project } from '@/lib/supabase'

const AVATARS = [
  { id: 0, name: 'Marcus', src: '/avatars/one.png' },
  { id: 1, name: 'Sophie', src: '/avatars/two.png' },
  { id: 2, name: 'Jade', src: '/avatars/three.png' },
]

const AVATAR_VOICE_MAP: Record<number, string> = {
  0: 'rdDUoCO1RjwdMmNjmhHV',
  1: 'kXsOSDWolD7e9l1Z0sbH',
  2: 'dMyQqiVXTU80dDl2eNK8',
}

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
        run(data)
      })
      .catch(() => router.replace('/'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(p: Project) {
    const { script, selected_avatar, product_media_url, product_media_type, music_url } = p

    // Stage: audio
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

    // Stage: lipsync
    setStageStatus('lipsync', 'active')
    let lipsyncVideoUrl: string | null = null
    try {
      const devLipsyncUrl = process.env.NEXT_PUBLIC_DEV_LIPSYNC_URL
      if (devLipsyncUrl) {
        lipsyncVideoUrl = devLipsyncUrl
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

    // Stage: merge
    const devCaptionedUrl = process.env.NEXT_PUBLIC_DEV_CAPTIONED_URL
    if (devCaptionedUrl) {
      setStageStatus('merge', 'done')
      setStageStatus('caption', 'done')
      await saveProject({ captioned_video_url: devCaptionedUrl })

      const devBgmUrl = process.env.NEXT_PUBLIC_DEV_BGM_URL
      if (devBgmUrl) {
        setStageStatus('bgm', 'done')
        setFinalVideoUrl(devBgmUrl)
        await saveProject({ final_video_url: devBgmUrl, status: 'done' })
        return
      }
      if (!music_url) {
        setStageStatus('bgm', 'done')
        setFinalVideoUrl(devCaptionedUrl)
        await saveProject({ final_video_url: devCaptionedUrl, status: 'done' })
        return
      }
      setStageStatus('bgm', 'active')
      try {
        const res = await fetch('/api/add-bgm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: devCaptionedUrl, musicUrl: music_url }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to add background music')
        }
        const data = await res.json()
        setFinalVideoUrl(data.finalVideoUrl)
        await saveProject({ final_video_url: data.finalVideoUrl, status: 'done' })
        setStageStatus('bgm', 'done')
      } catch (err) {
        setStageStatus('bgm', 'error')
        setError(err instanceof Error ? err.message : 'Background music failed')
        await saveProject({ status: 'error' })
      }
      return
    }

    setStageStatus('merge', 'active')
    let mergedUrl: string | null = null
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

    // Stage: caption
    setStageStatus('caption', 'active')
    let captionedUrl: string | null = null
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

    // Stage: bgm
    const devBgmUrl = process.env.NEXT_PUBLIC_DEV_BGM_URL
    if (devBgmUrl) {
      setStageStatus('bgm', 'done')
      setFinalVideoUrl(devBgmUrl)
      await saveProject({ final_video_url: devBgmUrl, status: 'done' })
      return
    }
    if (!music_url) {
      setStageStatus('bgm', 'done')
      setFinalVideoUrl(captionedUrl)
      await saveProject({ final_video_url: captionedUrl, status: 'done' })
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
      setFinalVideoUrl(data.finalVideoUrl)
      await saveProject({ final_video_url: data.finalVideoUrl, status: 'done' })
      setStageStatus('bgm', 'done')
    } catch (err) {
      setStageStatus('bgm', 'error')
      setError(err instanceof Error ? err.message : 'Background music failed')
      await saveProject({ status: 'error' })
    }
  }

  const allDone = stages.every((s) => s.status === 'done')
  const hasError = stages.some((s) => s.status === 'error')
  const avatar = AVATARS[project?.selected_avatar ?? 0]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3 shrink-0 sticky top-0 z-10">
        <img src="/logo.png" alt="Moonriver" width={28} height={28} className="shrink-0" />
        <span className="font-semibold text-base tracking-tight">Moonriver</span>

        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${id}`)}
            className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to editor
          </button>
          <UserButton />
        </div>
      </header>

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
                  <p className="text-xs text-muted-foreground">Product media + {avatar.name} · Ready to post</p>
                </div>
                <a
                  href={finalVideoUrl}
                  download="moonriver_ugc.mp4"
                  className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Download
                </a>
              </div>
              <video controls src={finalVideoUrl} className="w-48 rounded-xl mx-auto block border" />
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <div className="h-8" />
        </div>
      </main>
    </div>
  )
}
