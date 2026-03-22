'use client'

import { useState } from 'react'
import Image from 'next/image'
import VideoPreview from './components/VideoPreview'
import ProductMedia, { type ProductMediaValue } from './components/ProductMedia'

const AVATARS = [
  { id: 0, name: 'Marcus', src: '/avatars/one.png' },
  { id: 1, name: 'Sophie', src: '/avatars/two.png' },
  { id: 2, name: 'Jade', src: '/avatars/three.png' },
]

const AVATAR_VOICE_MAP: Record<number, string> = {
  0: 'rdDUoCO1RjwdMmNjmhHV', // Marcus — American Man
  1: 'kXsOSDWolD7e9l1Z0sbH', // Sophie — American Lady
  2: 'dMyQqiVXTU80dDl2eNK8', // Jade — American Lady
}

const MUSIC_OPTIONS = [
  { value: 'none', label: 'No music' },
  { value: 'upbeat', label: 'Upbeat Pop' },
  { value: 'lofi', label: 'Chill Lo-Fi' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'edm', label: 'Energetic EDM' },
]

const SAMPLE_SCRIPT = `Hey guys! I've been using this product for the past few weeks and honestly? It's been a game changer.

First thing I noticed — the quality is just incredible. Like, right out of the box you can tell this isn't your average product.

What really sold me is how easy it is to use. Literally took me five minutes to set up and I was off to the races.

If you're on the fence about this, don't be. The value you get for the price is honestly unmatched. I've tried so many alternatives and nothing comes close.

Link is in the bio — trust me, you won't regret it.`

type Step = 'input' | 'generating' | 'review' | 'creating'
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
    description: 'Synthesising speech with Eleven Labs',
    status: 'pending',
  },
  {
    id: 'lipsync',
    label: 'Generating lipsync',
    description: 'Adding lipsync to avatar',
    status: 'pending',
  },
]

export default function Home() {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [selectedMusic, setSelectedMusic] = useState('upbeat')
  const [script, setScript] = useState(SAMPLE_SCRIPT)
  const [productMedia, setProductMedia] = useState<ProductMediaValue>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)

  function setStageStatus(id: string, status: StageStatus) {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    )
  }

  async function handleGenerate() {
    if (!url.trim()) return
    setError(null)
    setStep('generating')
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate script')
      setScript(data.script)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('input')
    }
  }

  async function handleCreateVideo() {
    setAudioUrl(null)
    setVideoUrl(null)
    setStages(INITIAL_STAGES)
    setError(null)
    setStep('creating')

    // Stage: audio
    setStageStatus('audio', 'active')
    let audioDataUri: string | null = null
    try {
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

      // Convert to base64 data URI for lipsync API
      const arrayBuffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      let binary = ''
      uint8.forEach((b) => { binary += String.fromCharCode(b) })
      audioDataUri = `data:audio/mpeg;base64,${btoa(binary)}`

      setStageStatus('audio', 'done')
    } catch (err) {
      setStageStatus('audio', 'error')
      setError(err instanceof Error ? err.message : 'Audio generation failed')
      return
    }

    // Stage: lipsync
    setStageStatus('lipsync', 'active')
    try {
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
      setVideoUrl(data.videoUrl)
      setStageStatus('lipsync', 'done')
    } catch (err) {
      setStageStatus('lipsync', 'error')
      setError(err instanceof Error ? err.message : 'Lipsync generation failed')
    }
  }

  async function handleRegenerate() {
    if (!url.trim()) return
    setError(null)
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to regenerate script')
      setScript(data.script)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const allDone = stages.every((s) => s.status === 'done')
  const hasError = stages.some((s) => s.status === 'error')

  return (
    <div className="h-screen bg-zinc-50 text-zinc-900 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.277A1 1 0 0121 8.764v6.472a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <span className="font-semibold text-base tracking-tight text-zinc-900">UGC Maker</span>
      </header>

      {/* ── Step 1: URL input ── */}
      {step === 'input' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-xl space-y-8 text-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-600 text-xs font-medium px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                AI-powered UGC video generator
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                Paste a link.
                <br />
                Get a UGC video.
              </h1>
              <p className="text-zinc-500 text-base leading-relaxed max-w-sm mx-auto">
                Drop in your product URL and we'll generate a review script, avatar voiceover, and
                a ready-to-export video — in seconds.
              </p>
            </div>

            <div className="flex gap-2.5">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="https://yourproduct.com"
                className="flex-1 bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm shadow-sm"
              />
              <button
                onClick={handleGenerate}
                className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                Generate
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            <p className="text-xs text-zinc-400">
              Works with Shopify, Amazon, landing pages, and more
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1.5: Generating ── */}
      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-200" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-zinc-900 font-medium">Generating your video…</p>
            <p className="text-zinc-500 text-sm">Scraping product page and writing your script</p>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-header */}
          <div className="border-b border-zinc-200 bg-white px-6 py-3 flex items-center justify-between gap-4 shrink-0">
            <button
              onClick={() => setStep('input')}
              className="text-zinc-500 hover:text-zinc-900 text-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm text-zinc-500 truncate">
                {url || 'https://yourproduct.com'}
              </span>
            </div>

            <button
              onClick={handleCreateVideo}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Create Video
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* ── Left: Controls ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-zinc-50">

              {/* Voiceover script */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">Voiceover Script</label>
                  <button
                    onClick={handleRegenerate}
                    className="text-xs text-violet-600 hover:text-violet-500 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={9}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-800 text-sm leading-relaxed focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none placeholder:text-zinc-400 shadow-sm"
                />
              </section>

              {/* Background Music */}
              <section className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Background Music</label>
                <div className="relative">
                  <select
                    value={selectedMusic}
                    onChange={(e) => setSelectedMusic(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 pr-8 text-zinc-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 appearance-none cursor-pointer shadow-sm"
                  >
                    {MUSIC_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </section>

              {/* Avatar selection */}
              <section className="space-y-3">
                <label className="text-sm font-medium text-zinc-700">Avatar</label>
                <div className="flex gap-3">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${selectedAvatar === avatar.id
                          ? 'bg-violet-50 ring-2 ring-violet-500'
                          : 'hover:bg-zinc-100'
                        }`}
                    >
                      <div className="w-16 h-20 rounded-xl overflow-hidden shadow-md">
                        <Image
                          src={avatar.src}
                          alt={avatar.name}
                          width={64}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-zinc-600 font-medium">{avatar.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Product media */}
              <ProductMedia value={productMedia} onChange={setProductMedia} />
            </div>

            {/* ── Right: Preview ── */}
            <VideoPreview selectedAvatar={AVATARS[selectedAvatar]} productMedia={productMedia} />
          </div>
        </div>
      )}

      {/* ── Step 3: Creating ── */}
      {step === 'creating' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-header */}
          <div className="border-b border-zinc-200 bg-white px-6 py-3 flex items-center justify-between gap-4 shrink-0">
            <button
              onClick={() => setStep('review')}
              className="text-zinc-500 hover:text-zinc-900 text-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm text-zinc-500 truncate">
                {url || 'https://yourproduct.com'}
              </span>
            </div>

            <div className="w-24" /> {/* spacer to balance header */}
          </div>

          {/* Progress content */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6">

              {/* Title */}
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {allDone ? 'Your video is ready' : hasError ? 'Something went wrong' : 'Creating your video…'}
                </h2>
                <p className="text-sm text-zinc-500">
                  {allDone
                    ? 'Your lipsync video and voiceover are ready below.'
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
                          stage.status === 'error' ? 'text-red-600' :
                            'text-zinc-900'
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
                      <p className="text-xs text-zinc-500">{AVATARS[selectedAvatar].name} · American</p>
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
                      <p className="text-xs text-zinc-500">{AVATARS[selectedAvatar].name} · VEED Fabric 1.0</p>
                    </div>
                  </div>
                  <video
                    controls
                    src={videoUrl}
                    className="w-full rounded-xl"
                    style={{ maxHeight: '360px' }}
                  />
                </div>
              )}

              {/* Error message */}
              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
