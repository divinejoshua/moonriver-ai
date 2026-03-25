import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import path from 'path'
import { createCanvas } from '@napi-rs/canvas'
const execFileAsync = promisify(execFile)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG: string = require('ffmpeg-static')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFPROBE: string = require('ffprobe-static').path

async function getVideoInfo(filePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0',
    filePath,
  ])
  const [width, height] = stdout.trim().split(',').map(Number)
  return { width, height }
}

interface Chunk {
  text: string
  start: number
  end: number
}

async function transcribeToChunks(videoPath: string, maxWords: number): Promise<Chunk[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const videoBuffer = await readFile(videoPath)
  const formData = new FormData()
  formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'input.mp4')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whisper transcription failed: ${text}`)
  }

  const data = await res.json() as { words: { word: string; start: number; end: number }[] }
  const words = (data.words ?? []).map((w) => ({ ...w, word: w.word.trim() })).filter((w) => w.word)

  const chunks: Chunk[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    const group = words.slice(i, i + maxWords)
    chunks.push({
      text: group.map((w) => w.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
    })
  }
  return chunks
}

async function renderCaptionPng(
  text: string,
  videoWidth: number,
  videoHeight: number,
  fontSize: number,
  marginV: number,
): Promise<Buffer> {
  const canvas = createCanvas(videoWidth, videoHeight)
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, videoWidth, videoHeight)
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  const x = videoWidth / 2
  const y = videoHeight - marginV

  ctx.strokeStyle = 'black'
  ctx.lineWidth = fontSize * 0.08
  ctx.lineJoin = 'round'
  ctx.strokeText(text, x, y)

  ctx.fillStyle = 'white'
  ctx.fillText(text, x, y)

  return canvas.encode('png')
}

export interface CaptionOptions {
  input: string
  output: string
  tmpDir: string
  fontSize?: number
  marginV?: number
  maxWords?: number
}

export async function captionVideo(opts: CaptionOptions): Promise<void> {
  const { input, output, tmpDir, fontSize = 45, marginV = 80, maxWords = 4 } = opts

  const { width, height } = await getVideoInfo(input)
  const chunks = await transcribeToChunks(input, maxWords)

  if (chunks.length === 0) {
    await execFileAsync(FFMPEG, ['-y', '-i', input, '-c', 'copy', output])
    return
  }

  const pngPaths: string[] = []
  try {
    for (let i = 0; i < chunks.length; i++) {
      const pngPath = path.join(tmpDir, `cap_${i}.png`)
      const pngBuffer = await renderCaptionPng(chunks[i].text, width, height, fontSize, marginV)
      await writeFile(pngPath, pngBuffer)
      pngPaths.push(pngPath)
    }

    const ffArgs: string[] = ['-y', '-i', input]
    pngPaths.forEach((p) => ffArgs.push('-i', p))

    const filterParts: string[] = []
    let prev = '0:v'
    chunks.forEach((chunk, i) => {
      const inputIdx = i + 1
      const outLabel = i < chunks.length - 1 ? `v${i + 1}` : 'vout'
      filterParts.push(
        `[${prev}][${inputIdx}:v]overlay=x=(W-w)/2:y=H-h-${marginV}:enable='between(t,${chunk.start.toFixed(3)},${chunk.end.toFixed(3)})'[${outLabel}]`,
      )
      prev = outLabel
    })

    ffArgs.push(
      '-filter_complex', filterParts.join(';'),
      '-map', '[vout]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      output,
    )

    await execFileAsync(FFMPEG, ffArgs)
  } finally {
    await Promise.allSettled(pngPaths.map((p) => unlink(p).catch(() => {})))
  }
}
