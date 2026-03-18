import Image from 'next/image'
import type { ProductMediaValue } from './ProductMedia'

type Avatar = {
  id: number
  name: string
  src: string
}

type Props = {
  selectedAvatar: Avatar
  productMedia: ProductMediaValue
}

export default function VideoPreview({ selectedAvatar, productMedia }: Props) {
  return (
    <div className="w-[38%] border-l border-zinc-200 bg-white px-6 py-6 flex flex-col items-center gap-4 overflow-hidden shrink-0">
      <span className="text-sm font-medium text-zinc-500">Preview</span>

      {/* Portrait phone frame */}
      <div
        className="relative w-72 max-h-[calc(100vh-12rem)] rounded-[2rem] border-[3px] border-zinc-300 overflow-hidden bg-zinc-100 shadow-xl shadow-zinc-200"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Top segment — Product media (60%) */}
        <div
          className="absolute top-0 left-0 right-0 bg-zinc-100 overflow-hidden"
          style={{ height: '60%' }}
        >
          {productMedia ? (
            productMedia.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productMedia.src} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <video src={productMedia.src} className="w-full h-full object-cover" muted loop autoPlay />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <svg
                className="w-8 h-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                Product Demo
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="absolute left-0 right-0 h-px bg-zinc-200 z-10"
          style={{ top: '60%' }}
        />

        {/* Bottom segment — Avatar voiceover (40%) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-zinc-100 overflow-hidden"
          style={{ height: '40%' }}
        >
          <Image
            src={selectedAvatar.src}
            alt={selectedAvatar.name}
            fill
            className="object-cover"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-400 text-center leading-relaxed">
        9:16 portrait format
        <br />
        Product demo on top · Avatar below
      </p>
    </div>
  )
}
