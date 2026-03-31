import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import path from 'path'
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

function toAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.round((seconds % 1) * 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function generateAss(
  chunks: Chunk[],
  width: number,
  height: number,
  fontSize: number,
  marginV: number,
): string {
  const outlineSize = Math.round(fontSize * 0.08)
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,${outlineSize},0,2,10,10,${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  for (const chunk of chunks) {
    const text = chunk.text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
    lines.push(`Dialogue: 0,${toAssTime(chunk.start)},${toAssTime(chunk.end)},Default,,0,0,0,,${text}`)
  }

  return lines.join('\n')
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

  const assPath = path.join(tmpDir, 'captions.ass')
  try {
    await writeFile(assPath, generateAss(chunks, width, height, fontSize, marginV))

    await execFileAsync(FFMPEG, [
      '-y', '-i', input,
      '-vf', `ass=${assPath}`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      output,
    ])
  } finally {
    await unlink(assPath).catch(() => {})
  }
}
