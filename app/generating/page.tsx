'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  {
    id: 'audio',
    label: 'Generating voiceover',
    description: 'Synthesising speech',
    status: 'pending',
  },
  {
    id: 'lipsync',
    label: 'Generating lipsync',
    description: 'Adding lip sync to avatar',
    status: 'pending',
  },
  {
    id: 'merge',
    label: 'Merging video',
    description: 'Combining product media with lipsync',
    status: 'pending',
  },
  {
    id: 'caption',
    label: 'Adding captions',
    description: 'Burning voiceover script as captions',
    status: 'pending',
  },
  {
    id: 'bgm',
    label: 'Adding background music',
    description: 'Mixing in background track at low volume',
    status: 'pending',
  },
]

export default function GeneratingPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarId, setAvatarId] = useState(0)
  const hasStarted = useRef(false)

  function setStageStatus(id: string, status: StageStatus) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const raw = sessionStorage.getItem('ugc_job')
    if (!raw) {
      router.replace('/')
      return
    }
    sessionStorage.removeItem('ugc_job')

    const { script, selectedAvatar, productMediaUrl, productMediaType, musicUrl } = JSON.parse(raw) as {
      script: string
      selectedAvatar: number
      productMediaUrl: string
      productMediaType: 'image' | 'video'
      musicUrl: string | null
    }

    setAvatarId(selectedAvatar)
    run(script, selectedAvatar, productMediaUrl, productMediaType, musicUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(
    script: string,
    selectedAvatar: number,
    productMediaUrl: string,
    productMediaType: 'image' | 'video',
    musicUrl: string | null,
  ) {
    // Stage: audio
    setStageStatus('audio', 'active')
    let audioDataUri: string | null = null
    try {
      const devAudioUrl = process.env.NEXT_PUBLIC_DEV_AUDIO_URL
      if (devAudioUrl) {
        // DEV: skip ElevenLabs API call and fetch the mock audio directly
        const res = await fetch(devAudioUrl)
        if (!res.ok) throw new Error('Failed to fetch dev audio')
        const blob = await res.blob()
        setAudioUrl(URL.createObjectURL(blob))
        const arrayBuffer = await blob.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        let binary = ''
        uint8.forEach((b) => { binary += String.fromCharCode(b) })
        audioDataUri = `data:audio/mpeg;base64,${btoa(binary)}`
      } else {
        const voiceId = AVATAR_VOICE_MAP[selectedAvatar]
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
        setAudioUrl(URL.createObjectURL(blob))
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
      return
    }

    // Stage: lipsync
    setStageStatus('lipsync', 'active')
    let lipsyncVideoUrl: string | null = null
    try {
      // DEV: skip VEED API call and use a local mock URL
      const devLipsyncUrl = process.env.NEXT_PUBLIC_DEV_LIPSYNC_URL
      if (devLipsyncUrl) {
        lipsyncVideoUrl = devLipsyncUrl
      } else {
        const res = await fetch('/api/generate-lipsync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: audioDataUri, avatarId: selectedAvatar }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to generate lipsync')
        }
        const data = await res.json()
        lipsyncVideoUrl = data.videoUrl
      }
      setVideoUrl(lipsyncVideoUrl)
      setStageStatus('lipsync', 'done')
    } catch (err) {
      setStageStatus('lipsync', 'error')
      setError(err instanceof Error ? err.message : 'Lipsync generation failed')
      return
    }

    // Stage: merge
    const devCaptionedUrl = process.env.NEXT_PUBLIC_DEV_CAPTIONED_URL
    if (devCaptionedUrl) {
      // DEV: skip merge + caption pipeline and use pre-generated captioned video
      setStageStatus('merge', 'done')
      setStageStatus('caption', 'done')
      // bgm still runs after this — fall through with captionedUrl
      const captionedUrlDev = devCaptionedUrl
      const devBgmUrlEarly = process.env.NEXT_PUBLIC_DEV_BGM_URL
      if (devBgmUrlEarly) {
        setStageStatus('bgm', 'done')
        setMergedVideoUrl(devBgmUrlEarly)
        return
      }
      if (!musicUrl) {
        setStageStatus('bgm', 'done')
        setMergedVideoUrl(captionedUrlDev)
        return
      }
      setStageStatus('bgm', 'active')
      try {
        const res = await fetch('/api/add-bgm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: captionedUrlDev, musicUrl }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to add background music')
        }
        const data = await res.json()
        setMergedVideoUrl(data.finalVideoUrl)
        setStageStatus('bgm', 'done')
      } catch (err) {
        setStageStatus('bgm', 'error')
        setError(err instanceof Error ? err.message : 'Background music failed')
      }
      return
    }
    setStageStatus('merge', 'active')
    let mergedUrl: string | null = null
    try {
      const res = await fetch('/api/merge-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lipsyncVideoUrl, productMediaUrl, productMediaType }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to merge video')
      }
      const data = await res.json()
      mergedUrl = data.mergedVideoUrl
      setStageStatus('merge', 'done')
    } catch (err) {
      setStageStatus('merge', 'error')
      setError(err instanceof Error ? err.message : 'Video merge failed')
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
      setStageStatus('caption', 'done')
    } catch (err) {
      setStageStatus('caption', 'error')
      setError(err instanceof Error ? err.message : 'Caption generation failed')
      return
    }

    // Stage: bgm
    const devBgmUrl = process.env.NEXT_PUBLIC_DEV_BGM_URL
    if (devBgmUrl) {
      // DEV: skip bgm pipeline and use pre-generated final video
      setStageStatus('bgm', 'done')
      setMergedVideoUrl(devBgmUrl)
      return
    }
    if (!musicUrl) {
      setStageStatus('bgm', 'done')
      setMergedVideoUrl(captionedUrl)
      return
    }
    setStageStatus('bgm', 'active')
    try {
      const res = await fetch('/api/add-bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: captionedUrl, musicUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add background music')
      }
      const data = await res.json()
      setMergedVideoUrl(data.finalVideoUrl)
      setStageStatus('bgm', 'done')
    } catch (err) {
      setStageStatus('bgm', 'error')
      setError(err instanceof Error ? err.message : 'Background music failed')
    }
  }

  const allDone = stages.every((s) => s.status === 'done')
  const hasError = stages.some((s) => s.status === 'error')
  const avatar = AVATARS[avatarId]

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shrink-0 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.277A1 1 0 0121 8.764v6.472a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <span className="font-semibold text-base tracking-tight">Moonriver</span>

        <div className="ml-auto">
          <button
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-zinc-900 text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to editor
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto py-12 px-4">
        <div className="max-w-lg mx-auto space-y-6">

          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              {allDone ? 'Your video is ready' : hasError ? 'Something went wrong' : 'Creating your video…'}
            </h2>
            <p className="text-sm text-zinc-500">
              {allDone
                ? 'Your merged UGC video is ready below.'
                : hasError
                  ? 'One or more stages failed. Go back and try again.'
                  : 'Sit tight while we build each asset.'}
            </p>
          </div>

          {/* Stage list */}
          <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 shadow-sm overflow-hidden">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-4 px-5 py-4">
                {/* Status icon */}
                <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                  {stage.status === 'done' && (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {stage.status === 'active' && (
                    <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  )}
                  {stage.status === 'pending' && (
                    <div className="w-7 h-7 rounded-full border-2 border-zinc-200" />
                  )}
                  {stage.status === 'error' && (
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${stage.status === 'pending' ? 'text-zinc-400' :
                    stage.status === 'error' ? 'text-red-600' : 'text-zinc-900'
                    }`}>
                    {stage.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${stage.status === 'pending' ? 'text-zinc-300' : 'text-zinc-500'
                    }`}>
                    {stage.description}
                  </p>
                </div>

                {/* Stage badge */}
                <div className="shrink-0">
                  {stage.status === 'active' && (
                    <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                      In progress
                    </span>
                  )}
                  {stage.status === 'done' && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                  {stage.status === 'error' && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Audio player */}
          {audioUrl && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Voiceover</p>
                  <p className="text-xs text-zinc-500">{avatar.name} · American</p>
                </div>
              </div>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}

          {/* Lipsync video player */}
          {videoUrl && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.277A1 1 0 0121 8.764v6.472a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Lipsync Preview</p>
                  <p className="text-xs text-zinc-500">{avatar.name} · Creator voice over</p>
                </div>
              </div>
              <video controls src={videoUrl} className="w-full rounded-xl" />
            </div>
          )}

          {/* Merged final video */}
          {mergedVideoUrl && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Final Video</p>
                  <p className="text-xs text-zinc-500">Product media + {avatar.name} · Ready to post</p>
                </div>
                <a
                  href={mergedVideoUrl}
                  download="moonriver_ugc.mp4"
                  className="ml-auto text-xs font-medium text-violet-600 hover:text-violet-500 transition-colors"
                >
                  Download
                </a>
              </div>
              <video controls src={mergedVideoUrl} className="w-full rounded-xl" />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          {/* Bottom padding so content clears the viewport */}
          <div className="h-8" />
        </div>
      </main>
    </div>
  )
}
