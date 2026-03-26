'use client'

import { useRef, useState } from 'react'

export type ProductMediaValue = {
  type: 'image' | 'video'
  /** Blob URL for local preview */
  previewSrc: string
  /** S3 URL used by the merge API */
  s3Url: string
} | null

type Props = {
  value: ProductMediaValue
  onChange: (value: ProductMediaValue) => void
}

export default function ProductMedia({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const previewSrc = URL.createObjectURL(file)
    const type = file.type.startsWith('video/') ? 'video' : 'image'

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload-media', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const { url: s3Url } = await res.json()
      onChange({ type, previewSrc, s3Url })
    } catch {
      setUploadError('Upload failed — please try again')
      URL.revokeObjectURL(previewSrc)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Product Media
          <span className="ml-1.5 text-xs text-destructive font-normal">Required</span>
        </label>
        {value && (
          <button
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="relative aspect-video bg-muted border border-border rounded-xl overflow-hidden group shadow-sm">
        {value ? (
          value.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.previewSrc} alt="Product media" className="w-full h-full object-cover" />
          ) : (
            <video src={value.previewSrc} className="w-full h-full object-cover" muted loop autoPlay />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-muted-foreground">No media selected</span>
            <span className="text-xs text-muted-foreground">Upload an image or video below</span>
          </div>
        )}

        {/* Upload overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-card/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-foreground font-medium">
              {value ? 'Replace media' : 'Upload media'}
            </p>
            <label className="bg-card hover:bg-muted border border-border text-foreground text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Image or Video
              <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-card/80 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </section>
  )
}
