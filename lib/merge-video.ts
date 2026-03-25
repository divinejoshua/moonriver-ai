import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
const execFileAsync = promisify(execFile)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG: string = require('ffmpeg-static')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFPROBE: string = require('ffprobe-static').path

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.tif'])

async function getDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    filePath,
  ])
  return parseFloat(stdout.trim())
}

function isImage(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

export interface MergeOptions {
  /** Path to the voiceover/face-cam video — sets the final duration */
  voiceover: string
  /** Path to the product image (PNG/JPG/WebP) or demo video (MP4/MOV/etc.) */
  product: string
  /** Output file path */
  output: string
  canvasWidth?: number
  canvasHeight?: number
  /** Background fill colour for image panel (default: white) */
  bgColor?: string
  /** Fit mode for demo videos: show full video with padding instead of cropping (default: false) */
  demoFit?: boolean
  demoPadding?: number
  demoBgColor?: string
}

export async function mergeVideo(opts: MergeOptions): Promise<void> {
  const {
    voiceover,
    product,
    output,
    canvasWidth = 1080,
    canvasHeight = 1920,
    bgColor = 'white',
    demoFit = false,
    demoPadding = 20,
    demoBgColor = 'black',
  } = opts

  const halfH = Math.floor(canvasHeight / 2)
  const productIsImage = isImage(product)
  const voDuration = await getDuration(voiceover)

  // Bottom panel: voiceover video scaled to fill its half
  const botFilter =
    `[0:v]scale=${canvasWidth}:${halfH}:force_original_aspect_ratio=increase,` +
    `crop=${canvasWidth}:${halfH}[bot]`

  let args: string[]

  if (productIsImage) {
    const topFilter =
      `[1:v]scale=${canvasWidth}:${halfH}:force_original_aspect_ratio=decrease,` +
      `pad=${canvasWidth}:${halfH}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}[top]`

    args = [
      '-y',
      '-i', voiceover,
      '-loop', '1',
      '-i', product,
      '-filter_complex', `${topFilter};${botFilter};[top][bot]vstack=inputs=2[out]`,
      '-map', '[out]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(voDuration),
      output,
    ]
  } else if (demoFit) {
    const innerW = canvasWidth - 2 * demoPadding
    const innerH = halfH - 2 * demoPadding
    const topFilter =
      `[1:v]scale=${innerW}:${innerH}:force_original_aspect_ratio=decrease,` +
      `pad=${canvasWidth}:${halfH}:(ow-iw)/2:(oh-ih)/2:color=${demoBgColor},` +
      `fps=fps=25[top]`

    args = [
      '-y',
      '-i', voiceover,
      '-stream_loop', '-1',
      '-i', product,
      '-filter_complex', `${topFilter};${botFilter};[top][bot]vstack=inputs=2[out]`,
      '-map', '[out]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(voDuration),
      output,
    ]
  } else {
    // Fill mode (default): scale to fill top panel, crop edges
    const topFilter =
      `[1:v]scale=${canvasWidth}:${halfH}:force_original_aspect_ratio=increase,` +
      `crop=${canvasWidth}:${halfH},` +
      `fps=fps=25[top]`

    args = [
      '-y',
      '-i', voiceover,
      '-stream_loop', '-1',
      '-i', product,
      '-filter_complex', `${topFilter};${botFilter};[top][bot]vstack=inputs=2[out]`,
      '-map', '[out]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(voDuration),
      output,
    ]
  }

  await execFileAsync(FFMPEG, args)
}
