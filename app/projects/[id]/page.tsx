'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import Header from '@/app/components/Header'
import VideoPreview from '@/app/components/VideoPreview'
import ProductMedia, { type ProductMediaValue } from '@/app/components/ProductMedia'
import bgmTracks from '@/public/bgm.json'
import type { Project } from '@/lib/supabase'
import { AVATARS } from '@/lib/constants'

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor state — populated from project on load
  const [script, setScript] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const defaultTrack = bgmTracks.find((t) => t.name === 'me-and-the-devil')!
  const [selectedMusic, setSelectedMusic] = useState<string>(defaultTrack.url)
  const [musicExpanded, setMusicExpanded] = useState(false)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [productMedia, setProductMedia] = useState<ProductMediaValue>(null)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data: Project & { error?: string }) => {
        if (data.error) { router.replace('/'); return }
        setProject(data)
        setScript(data.script ?? '')
        setSelectedAvatar(data.selected_avatar ?? 0)
        if (data.music_url) setSelectedMusic(data.music_url)
        if (data.product_media_url) {
          setProductMedia({
            s3Url: data.product_media_url,
            type: data.product_media_type ?? 'image',
            previewSrc: data.product_media_url,
          })
        }
        setLoading(false)
      })
      .catch(() => router.replace('/'))
  }, [id, router])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingTrack(null)
  }

  function togglePlay(trackUrl: string) {
    if (playingTrack === trackUrl) {
      stopAudio()
    } else {
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(trackUrl)
      audio.addEventListener('ended', () => setPlayingTrack(null))
      audio.play()
      audioRef.current = audio
      setPlayingTrack(trackUrl)
    }
  }

  async function handleRegenerate() {
    if (!project?.url) return
    setError(null)
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: project.url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to regenerate script')
      setScript(data.script)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleCreateVideo() {
    if (!productMedia) return
    stopAudio()
    setSaving(true)
    setError(null)
    try {
      const patchRes = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          selected_avatar: selectedAvatar,
          music_url: selectedMusic === 'none' ? null : selectedMusic,
          product_media_url: productMedia.s3Url,
          product_media_type: productMedia.type,
          status: 'generating',
          // Reset intermediate URLs so the pipeline re-runs all stages
          audio_url: null,
          lipsync_video_url: null,
          merged_video_url: null,
          captioned_video_url: null,
          final_video_url: null,
        }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json()
        throw new Error(data.error ?? 'Failed to save project')
      }

      const genRes = await fetch(`/api/projects/${id}/generate`, { method: 'POST' })
      if (!genRes.ok) {
        const data = await genRes.json()
        throw new Error(data.error ?? 'Failed to start generation')
      }

      router.push(`/projects/${id}/generating`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-border" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header>
        <UserButton />
      </Header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sub-header */}
        <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{project?.url}</span>
          </div>

          <button
            onClick={handleCreateVideo}
            disabled={!productMedia || saving || script.length > 400}
            title={
              !productMedia
                ? 'Upload a product image or video first'
                : script.length > 400
                ? 'Script exceeds 400 character limit'
                : undefined
            }
            className={`text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              productMedia && !saving && script.length <= 400
                ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                : 'bg-primary/40 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving…' : 'Create Video'}
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Controls */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-background">

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {/* Voiceover script */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Voiceover Script</label>
                <div className="flex items-center gap-3">
                  <span className={`text-xs tabular-nums ${script.length > 400 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {script.length}/400
                  </span>
                  <button
                    onClick={handleRegenerate}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                maxLength={400}
                rows={9}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm leading-relaxed focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground shadow-sm"
              />
            </section>

            {/* Background Music */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Background Music</label>
                <button
                  onClick={() => setMusicExpanded((v) => !v)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {musicExpanded ? 'Done' : 'Change'}
                </button>
              </div>

              <div className="space-y-1.5">
                {musicExpanded ? (
                  <>
                    <button
                      onClick={() => { setSelectedMusic('none'); setMusicExpanded(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        selectedMusic === 'none'
                          ? 'bg-accent border-primary/50 ring-1 ring-ring'
                          : 'bg-card border-border hover:border-ring/50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      </div>
                      <span className={`flex-1 text-left font-medium ${selectedMusic === 'none' ? 'text-accent-foreground' : 'text-foreground'}`}>
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
                              ? 'bg-accent border-primary/50 ring-1 ring-ring'
                              : 'bg-card border-border hover:border-ring/50'
                          }`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(track.url) }}
                            className="w-7 h-7 rounded-full bg-muted hover:bg-secondary flex items-center justify-center shrink-0 transition-colors"
                          >
                            {isPlaying ? (
                              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-left font-medium truncate ${isSelected ? 'text-accent-foreground' : 'text-foreground'}`}>
                            {displayName}
                          </span>
                          {isPlaying && (
                            <span className="text-xs text-primary font-medium shrink-0">Playing</span>
                          )}
                        </div>
                      )
                    })}
                  </>
                ) : (
                  (() => {
                    const track = bgmTracks.find((t) => t.url === selectedMusic)
                    const isPlaying = playingTrack === selectedMusic
                    const displayName = track
                      ? track.name.replace(/[+_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                      : 'No music'
                    return (
                      <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-accent border-primary/50 ring-1 ring-ring text-sm">
                        {track ? (
                          <button
                            onClick={() => togglePlay(track.url)}
                            className="w-7 h-7 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center shrink-0 transition-colors"
                          >
                            {isPlaying ? (
                              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          </div>
                        )}
                        <span className="flex-1 font-medium text-accent-foreground truncate">{displayName}</span>
                        {isPlaying && (
                          <span className="text-xs text-primary font-medium shrink-0">Playing</span>
                        )}
                      </div>
                    )
                  })()
                )}
              </div>
            </section>

            {/* Avatar selection */}
            <section className="space-y-3">
              <label className="text-sm font-medium text-foreground">Avatar</label>
              <div className="flex gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${
                      selectedAvatar === avatar.id ? 'bg-accent ring-2 ring-primary' : 'hover:bg-muted'
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
                    <span className="text-xs text-muted-foreground font-medium">{avatar.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Product media */}
            <ProductMedia value={productMedia} onChange={setProductMedia} />
          </div>

          {/* Right: Preview */}
          <VideoPreview selectedAvatar={AVATARS[selectedAvatar]} productMedia={productMedia} />
        </div>
      </div>
    </div>
  )
}
