const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public'

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
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename)

  const res = await fetch(`${HEDRA_BASE_URL}/assets/${assetId}/upload`, {
    method: 'POST',
    headers: hedraHeaders(),
    body: formData,
  })
  if (!res.ok) throw new Error(`Hedra uploadAsset failed: ${res.status} ${await res.text()}`)
}

async function getDefaultModelId(): Promise<string> {
  const res = await fetch(`${HEDRA_BASE_URL}/models`, {
    headers: hedraHeaders(),
  })
  if (!res.ok) throw new Error(`Hedra listModels failed: ${res.status} ${await res.text()}`)
  const models = await res.json() as Array<{ id: string; name: string }>
  // Prefer Character-3 (best quality), fall back to first available
  const preferred = models.find((m) => m.name?.toLowerCase().includes('character-3'))
    ?? models.find((m) => m.name?.toLowerCase().includes('avatar'))
    ?? models[0]
  if (!preferred) throw new Error('No Hedra models available')
  return preferred.id
}

async function submitGeneration(params: {
  modelId: string
  imageAssetId: string
  audioAssetId: string
  durationMs: number
}): Promise<string> {
  const body = {
    type: 'video',
    ai_model_id: params.modelId,
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

async function pollGeneration(generationId: string, timeoutMs = 300_000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${HEDRA_BASE_URL}/generations/${generationId}/status`, {
      headers: hedraHeaders(),
    })
    if (!res.ok) throw new Error(`Hedra pollGeneration failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { status: string; download_url?: string; error_message?: string }

    if (data.status === 'complete') {
      if (!data.download_url) throw new Error('Hedra generation complete but no download_url')
      return data.download_url
    }
    if (data.status === 'error' || data.error_message) {
      throw new Error(`Hedra generation failed: ${data.error_message ?? 'unknown error'}`)
    }

    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('Hedra generation timed out')
}

/**
 * Generate a lipsync video using Hedra.
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
  const modelId = await getDefaultModelId()

  const [imageAssetId, audioAssetId] = await Promise.all([
    createAsset('image', imageFilename),
    createAsset('audio', `audio-${Date.now()}.mp3`),
  ])

  await Promise.all([
    uploadAsset(imageAssetId, imageBuffer, imageFilename, imageMimeType),
    uploadAsset(audioAssetId, audioBuffer, `audio-${Date.now()}.mp3`, 'audio/mpeg'),
  ])

  const generationId = await submitGeneration({
    modelId,
    imageAssetId,
    audioAssetId,
    durationMs: audioDurationMs,
  })

  const downloadUrl = await pollGeneration(generationId)

  const videoRes = await fetch(downloadUrl)
  if (!videoRes.ok) throw new Error(`Failed to download Hedra video: ${videoRes.status}`)
  return Buffer.from(await videoRes.arrayBuffer())
}
