'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import VideoPreview from './components/VideoPreview'
import ProductMedia, { type ProductMediaValue } from './components/ProductMedia'
import bgmTracks from '@/public/bgm.json'

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


const SAMPLE_SCRIPT = `Hey guys! I've been using this product for the past few weeks and honestly? It's been a game changer.

First thing I noticed — the quality is just incredible. Like, right out of the box you can tell this isn't your average product.

What really sold me is how easy it is to use. Literally took me five minutes to set up and I was off to the races.

If you're on the fence about this, don't be. The value you get for the price is honestly unmatched. I've tried so many alternatives and nothing comes close.

Link is in the bio — trust me, you won't regret it.`

type Step = 'input' | 'generating' | 'review'

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const defaultTrack = bgmTracks.find((t) => t.name === 'me-and-the-devil')!
  const [selectedMusic, setSelectedMusic] = useState<string>(defaultTrack.url)
  const [musicExpanded, setMusicExpanded] = useState(false)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [script, setScript] = useState(SAMPLE_SCRIPT)
  const [productMedia, setProductMedia] = useState<ProductMediaValue>(null)
  const [error, setError] = useState<string | null>(null)

  function togglePlay(url: string) {
    if (playingTrack === url) {
      audioRef.current?.pause()
      setPlayingTrack(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(url)
      audio.addEventListener('ended', () => setPlayingTrack(null))
      audio.play()
      audioRef.current = audio
      setPlayingTrack(url)
    }
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

  function handleCreateVideo() {
    if (!productMedia) return
    sessionStorage.setItem(
      'ugc_job',
      JSON.stringify({ script, selectedAvatar, productMediaUrl: productMedia.s3Url, productMediaType: productMedia.type, musicUrl: selectedMusic === 'none' ? null : selectedMusic }),
    )
    router.push('/generating')
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

  return (
    <div className="h-screen bg-zinc-50 text-zinc-900 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.277A1 1 0 0121 8.764v6.472a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <span className="font-semibold text-base tracking-tight text-zinc-900">Moonriver</span>
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
              disabled={!productMedia}
              title={!productMedia ? 'Upload a product image or video first' : undefined}
              className={`text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                productMedia
                  ? 'bg-violet-600 hover:bg-violet-500 cursor-pointer'
                  : 'bg-violet-300 cursor-not-allowed'
              }`}
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
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">Background Music</label>
                  <button
                    onClick={() => setMusicExpanded((v) => !v)}
                    className="text-xs text-violet-600 hover:text-violet-500 transition-colors"
                  >
                    {musicExpanded ? 'Done' : 'Change'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {musicExpanded ? (
                    /* Expanded: show all tracks + no-music option */
                    <>
                      <button
                        onClick={() => { setSelectedMusic('none'); setMusicExpanded(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          selectedMusic === 'none'
                            ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-400'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        </div>
                        <span className={`flex-1 text-left font-medium ${selectedMusic === 'none' ? 'text-violet-700' : 'text-zinc-700'}`}>
                          No music
                        </span>
                      </button>

                      {bgmTracks.map((track) => {
                        const isSelected = selectedMusic === track.url
                        const isPlaying = playingTrack === track.url
                        const displayName = track.name.replace(/[+_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        return (
                          <div
                            key={track.url}
                            onClick={() => { setSelectedMusic(track.url); setMusicExpanded(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-400'
                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePlay(track.url) }}
                              className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-violet-100 flex items-center justify-center shrink-0 transition-colors"
                            >
                              {isPlaying ? (
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                            <span className={`flex-1 text-left font-medium truncate ${isSelected ? 'text-violet-700' : 'text-zinc-700'}`}>
                              {displayName}
                            </span>
                            {isPlaying && (
                              <span className="text-xs text-violet-500 font-medium shrink-0">Playing</span>
                            )}
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    /* Collapsed: show only the selected track */
                    (() => {
                      const track = bgmTracks.find((t) => t.url === selectedMusic)
                      const isPlaying = playingTrack === selectedMusic
                      const displayName = track
                        ? track.name.replace(/[+_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        : 'No music'
                      return (
                        <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-violet-50 border-violet-300 ring-1 ring-violet-400 text-sm">
                          {track ? (
                            <button
                              onClick={() => togglePlay(track.url)}
                              className="w-7 h-7 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              {isPlaying ? (
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                            </div>
                          )}
                          <span className="flex-1 font-medium text-violet-700 truncate">{displayName}</span>
                          {isPlaying && (
                            <span className="text-xs text-violet-500 font-medium shrink-0">Playing</span>
                          )}
                        </div>
                      )
                    })()
                  )}
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

    </div>
  )
}
