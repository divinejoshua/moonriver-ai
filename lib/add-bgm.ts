import { execFile } from 'child_process'
import { promisify } from 'util'
const execFileAsync = promisify(execFile)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG: string = require('ffmpeg-static')

export interface AddBgmOptions {
  /** Path to the input video (with original audio) */
  video: string
  /** Path to the background music file */
  music: string
  /** Output file path */
  output: string
  /** Music volume as a decimal — 0.10 = 10% (default) */
  musicVolume?: number
}

export async function addBgm(opts: AddBgmOptions): Promise<void> {
  const { video, music, output, musicVolume = 0.10 } = opts

  const args = [
    '-y',
    '-i', video,
    '-stream_loop', '-1',
    '-i', music,
    '-filter_complex',
    `[1:a]volume=${musicVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    output,
  ]

  await execFileAsync(FFMPEG, args)
}
