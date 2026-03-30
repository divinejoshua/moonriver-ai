const PROOF_VIDEOS = [
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/final_1774627824876.mp4',
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/final_1774794026240.mp4',
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/lipsync-1774178241706_merged_with_music.mp4',
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/ugc_reel_final.mp4',
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/main-voice-over_merged_captioned_with_music.mp4',
  'https://didiai-test.s3.us-east-2.amazonaws.com/moonriver-assets/moonriver-public-ugc/video-3_merged_captioned_with_music.mp4',
]

export default function ProofVideos() {
  return (
    <section className="border-t border-border px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-foreground">Videos made with Moonriver</h2>
          <p className="text-muted-foreground text-sm mt-2">Real UGC videos generated on this platform</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PROOF_VIDEOS.map((src) => (
            <div
              key={src}
              className="relative bg-muted border border-border rounded-2xl overflow-hidden"
              style={{ aspectRatio: '9/16' }}
            >
              <video
                src={src}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
