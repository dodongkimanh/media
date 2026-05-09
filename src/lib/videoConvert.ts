import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ff: FFmpeg | null = null
let loaded = false

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ff) ff = new FFmpeg()
  if (loaded) return ff
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  loaded = true
  return ff
}

export async function convertVideoToH264(
  file: File,
  onProgress?: (pct: number) => void
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('video/')) return file

  const ffmpeg = await getFFmpeg()
  const ext = file.name.split('.').pop() ?? 'mp4'
  const ts = Date.now()
  const inName = `in_${ts}.${ext}`
  const outName = `out_${ts}.mp4`

  const handler = onProgress
    ? ({ progress }: { progress: number }) => onProgress(Math.min(99, Math.round(progress * 100)))
    : null

  if (handler) ffmpeg.on('progress', handler)

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file))
    await ffmpeg.exec([
      '-i', inName,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', outName,
    ])
    const raw = await ffmpeg.readFile(outName)
    onProgress?.(100)
    const bytes = raw instanceof Uint8Array ? raw.slice() : new TextEncoder().encode(raw as string)
    const base = file.name.replace(/\.[^.]+$/, '')
    return new File([bytes], `${base}.mp4`, { type: 'video/mp4' })
  } finally {
    if (handler) ffmpeg.off('progress', handler)
    await ffmpeg.deleteFile(inName).catch(() => {})
    await ffmpeg.deleteFile(outName).catch(() => {})
  }
}
