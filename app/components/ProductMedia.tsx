'use client'

import { useState, useRef } from 'react'

export default function ProductMedia() {
  const [preview, setPreview] = useState<{ type: 'image' | 'video'; src: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const src = URL.createObjectURL(file)
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setPreview({ type, src })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">Product Media</label>
        {preview && (
          <button
            onClick={() => {
              setPreview(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Reset to landing page
          </button>
        )}
      </div>

      <div className="relative aspect-video bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden group shadow-sm">
        {/* Content: either uploaded file or placeholder */}
        {preview ? (
          preview.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.src} alt="Product media" className="w-full h-full object-cover" />
          ) : (
            <video src={preview.src} className="w-full h-full object-cover" muted loop autoPlay />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-zinc-500">Product Landing Page</span>
            <span className="text-xs text-zinc-400">Screenshot captured from URL</span>
          </div>
        )}

        {/* Upload overlay — shown on hover */}
        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-zinc-700 font-medium">Replace with your own</p>
          <label className="bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload Image or Video
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>
      </div>
    </section>
  )
}
