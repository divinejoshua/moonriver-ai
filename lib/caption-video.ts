import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { createCanvas } from '@napi-rs/canvas'

const execFileAsync = promisify(execFile)

async function getVideoInfo(filePath: string): Promise<{ width: number; height: number; duration: number }> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    filePath,
  ])
  const lines = stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  // ffprobe csv output: first line is stream (width,height), second is format (duration)
  const [width, height] = lines[0].split(',').map(Number)
  const duration = parseFloat(lines[1])
  return { width, height, duration }
}

interface Chunk {
  text: string
  start: number
  end: number
}

function buildChunks(script: string, duration: number, maxWords: number): Chunk[] {
  const words = script.trim().split(/\s+/).filter(Boolean)
  const groups: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    groups.push(words.slice(i, i + maxWords).join(' '))
  }
  if (groups.length === 0) return []
  const chunkDur = duration / groups.length
  return groups.map((text, i) => ({
    text,
    start: i * chunkDur,
    end: (i + 1) * chunkDur,
  }))
}

function buildChunksFromTimings(
  timings: { word: string; start: number; end: number }[],
  maxWords: number,
): Chunk[] {
  const chunks: Chunk[] = []
  for (let i = 0; i < timings.length; i += maxWords) {
    const group = timings.slice(i, i + maxWords)
    chunks.push({
      text: group.map((t) => t.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
    })
  }
  return chunks
}

/** Render a caption as a transparent RGBA PNG — white bold text with black outline. */
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

  // Black outline
  ctx.strokeStyle = 'black'
  ctx.lineWidth = fontSize * 0.08
  ctx.lineJoin = 'round'
  ctx.strokeText(text, x, y)

  // White fill
  ctx.fillStyle = 'white'
  ctx.fillText(text, x, y)

  return canvas.encode('png')
}

export interface CaptionOptions {
  input: string
  output: string
  script: string
  /** Directory to write temp PNG files — should be the same tmpDir as the caller */
  tmpDir: string
  fontSize?: number
  marginV?: number
  maxWords?: number
  /** Word-level timestamps from ElevenLabs — when provided, captions sync to actual speech */
  wordTimings?: { word: string; start: number; end: number }[]
}

export async function captionVideo(opts: CaptionOptions): Promise<void> {
  const { input, output, script, tmpDir, fontSize = 45, marginV = 80, maxWords = 4, wordTimings } = opts

  const { width, height, duration } = await getVideoInfo(input)
  const chunks = wordTimings && wordTimings.length > 0
    ? buildChunksFromTimings(wordTimings, maxWords)
    : buildChunks(script, duration, maxWords)

  if (chunks.length === 0) {
    await execFileAsync('ffmpeg', ['-y', '-i', input, '-c', 'copy', output])
    return
  }

  // Render each caption chunk as a transparent PNG
  const pngPaths: string[] = []
  try {
    for (let i = 0; i < chunks.length; i++) {
      const pngPath = path.join(tmpDir, `cap_${i}.png`)
      const pngBuffer = await renderCaptionPng(chunks[i].text, width, height, fontSize, marginV)
      await writeFile(pngPath, pngBuffer)
      pngPaths.push(pngPath)
    }

    // Build FFmpeg args: main video + one -i per caption PNG
    const ffArgs: string[] = ['-y', '-i', input]
    pngPaths.forEach((p) => ffArgs.push('-i', p))

    // Build filter_complex: chain overlay filters, one per caption
    // [0:v][1:v]overlay=...:enable='between(t,s,e)'[v1];[v1][2:v]overlay=...
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

    await execFileAsync('ffmpeg', ffArgs)
  } finally {
    await Promise.allSettled(pngPaths.map((p) => unlink(p).catch(() => {})))
  }
}
