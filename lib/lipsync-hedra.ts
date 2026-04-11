const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public'

// Stable model IDs from Hedra docs — no need to fetch dynamically
// Hedra Avatar: talking-head lip-sync, up to 10 minutes
const HEDRA_AVATAR_MODEL_ID = '26f0fc66-152b-40ab-abed-76c43df99bc8'

function hedraHeaders(): HeadersInit {
  return {
    'X-API-Key': process.env.HEDRA_API_KEY!,
    'Accept': 'application/json',
  }
}

async function createAsset(type: 'image' | 'audio', name: string): Promise<string> {
  const res = await fetch(`${HEDRA_BASE_URL}/assets`, {
    method: 'POST',
    headers: { ...hedraHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name }),
  })
  if (!res.ok) throw new Error(`Hedra createAsset failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.id as string
}

async function uploadAsset(assetId: string, fileBuffer: Buffer, filename: string, mimeType: string): Promise<void> {
  const formData = new FormData()
  const arrayBuffer = fileBuffer.buffer as ArrayBuffer
  formData.append('file', new Blob([arrayBuffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)], { type: mimeType }), filename)

  const res = await fetch(`${HEDRA_BASE_URL}/assets/${assetId}/upload`, {
    method: 'POST',
    headers: hedraHeaders(),
    body: formData,
  })
  if (!res.ok) throw new Error(`Hedra uploadAsset failed: ${res.status} ${await res.text()}`)
}

async function submitGeneration(params: {
  imageAssetId: string
  audioAssetId: string
  durationMs: number
}): Promise<string> {
  const body = {
    type: 'video',
    ai_model_id: HEDRA_AVATAR_MODEL_ID,
    start_keyframe_id: params.imageAssetId,
    audio_id: params.audioAssetId,
    generated_video_inputs: {
      text_prompt: 'A person talking directly to the camera',
      resolution: '540p',
      aspect_ratio: '16:9',
      duration_ms: params.durationMs,
    },
  }

  const res = await fetch(`${HEDRA_BASE_URL}/generations`, {
    method: 'POST',
    headers: { ...hedraHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Hedra submitGeneration failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.id as string
}

async function pollGeneration(generationId: string): Promise<string> {
  // Poll indefinitely — Hedra Avatar can take 10-20 min for longer clips.
  // The pipeline runs fire-and-forget on a persistent server so there is no
  // infrastructure timeout to worry about.
  while (true) {
    const res = await fetch(`${HEDRA_BASE_URL}/generations/${generationId}/status`, {
      headers: hedraHeaders(),
    })
    if (!res.ok) throw new Error(`Hedra pollGeneration failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as {
      status: string
      download_url?: string
      progress?: number
      eta_sec?: number
      error_message?: string
    }

    console.log(
      `[hedra] generation ${generationId} — status: ${data.status}` +
      (data.progress != null ? `, progress: ${Math.round(data.progress * 100)}%` : '') +
      (data.eta_sec != null ? `, eta: ${data.eta_sec}s` : ''),
    )

    if (data.status === 'complete') {
      if (!data.download_url) throw new Error('Hedra generation complete but no download_url returned')
      return data.download_url
    }
    if (data.status === 'error' || data.error_message) {
      throw new Error(`Hedra generation failed: ${data.error_message ?? 'unknown error'}`)
    }

    await new Promise((r) => setTimeout(r, 10_000))
  }
}

/**
 * Generate a lipsync video using Hedra Avatar.
 * @param imageBuffer - The avatar image file buffer
 * @param imageFilename - Filename for the image (e.g. "avatar.jpg")
 * @param imageMimeType - MIME type (e.g. "image/jpeg")
 * @param audioBuffer - The audio file buffer
 * @param audioDurationMs - Approximate audio duration in milliseconds
 * @returns Buffer of the generated MP4 video
 */
export async function generateLipsyncWithHedra(
  imageBuffer: Buffer,
  imageFilename: string,
  imageMimeType: string,
  audioBuffer: Buffer,
  audioDurationMs: number,
): Promise<Buffer> {
  const [imageAssetId, audioAssetId] = await Promise.all([
    createAsset('image', imageFilename),
    createAsset('audio', `audio-${Date.now()}.mp3`),
  ])

  await Promise.all([
    uploadAsset(imageAssetId, imageBuffer, imageFilename, imageMimeType),
    uploadAsset(audioAssetId, audioBuffer, `audio-${Date.now()}.mp3`, 'audio/mpeg'),
  ])

  const generationId = await submitGeneration({
    imageAssetId,
    audioAssetId,
    durationMs: audioDurationMs,
  })

  console.log(`[hedra] submitted generation ${generationId}`)

  const downloadUrl = await pollGeneration(generationId)

  const videoRes = await fetch(downloadUrl)
  if (!videoRes.ok) throw new Error(`Failed to download Hedra video: ${videoRes.status}`)
  return Buffer.from(await videoRes.arrayBuffer())
}
