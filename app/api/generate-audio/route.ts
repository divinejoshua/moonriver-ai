interface ElevenLabsAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

interface WordTiming {
  word: string
  start: number
  end: number
}

function buildWordTimings(alignment: ElevenLabsAlignment): WordTiming[] {
  const words: WordTiming[] = []
  let currentWord = ''
  let wordStart = 0

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i]
    if (char === ' ' || char === '\n') {
      if (currentWord) {
        words.push({ word: currentWord, start: wordStart, end: alignment.character_end_times_seconds[i - 1] })
        currentWord = ''
      }
    } else {
      if (!currentWord) wordStart = alignment.character_start_times_seconds[i]
      currentWord += char
    }
  }
  if (currentWord) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: alignment.character_end_times_seconds[alignment.characters.length - 1],
    })
  }
  return words
}

export async function POST(request: Request) {
  const { script, voiceId } = await request.json()

  if (!script || !voiceId) {
    return Response.json({ error: 'Missing script or voiceId' }, { status: 400 })
  }

  const apiKey = process.env.ELEVEN_LABS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Eleven Labs API key not configured' }, { status: 500 })
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
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

  const data = await res.json() as { audio_base64: string; alignment: ElevenLabsAlignment; normalized_alignment: ElevenLabsAlignment }
  // normalized_alignment strips punctuation and spaces, giving cleaner word boundaries
  const wordTimings = buildWordTimings(data.normalized_alignment ?? data.alignment)

  return Response.json({ audioBase64: data.audio_base64, wordTimings })
}
