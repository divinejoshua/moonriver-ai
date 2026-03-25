export async function POST(request: Request) {
  const { script, voiceId } = await request.json()

  if (!script || !voiceId) {
    return Response.json({ error: 'Missing script or voiceId' }, { status: 400 })
  }

  const apiKey = process.env.ELEVEN_LABS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Eleven Labs API key not configured' }, { status: 500 })
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.2 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return Response.json({ error: text }, { status: 500 })
  }

  const audioBuffer = await res.arrayBuffer()
  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
