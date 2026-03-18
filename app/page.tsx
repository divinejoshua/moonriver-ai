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

const VOICES = [
  { value: 'sarah', label: 'Sarah — Female, American' },
  { value: 'james', label: 'James — Male, American' },
  { value: 'emma', label: 'Emma — Female, British' },
  { value: 'carlos', label: 'Carlos — Male, Spanish' },
  { value: 'aisha', label: 'Aisha — Female, Nigerian' },
]

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

type Step = 'input' | 'generating' | 'review'

export default function Home() {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState('sarah')
  const [selectedMusic, setSelectedMusic] = useState('upbeat')
  const [script, setScript] = useState(SAMPLE_SCRIPT)
  const [productMedia, setProductMedia] = useState<ProductMediaValue>(null)

  function handleGenerate() {
    setStep('generating')
    setTimeout(() => setStep('review'), 1500)
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

            <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
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
                  <button className="text-xs text-violet-600 hover:text-violet-500 transition-colors">
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

              {/* Voice + Music */}
              <div className="grid grid-cols-2 gap-4">
                <section className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Voice</label>
                  <div className="relative">
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 pr-8 text-zinc-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 appearance-none cursor-pointer shadow-sm"
                    >
                      {VOICES.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
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
              </div>

              {/* Avatar selection */}
              <section className="space-y-3">
                <label className="text-sm font-medium text-zinc-700">Avatar</label>
                <div className="flex gap-3">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${
                        selectedAvatar === avatar.id
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
