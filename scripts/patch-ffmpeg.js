// Patch @ffmpeg/ffmpeg worker.js to add webpackIgnore comment
// so Webpack/Turbopack don't intercept the dynamic import of the WASM core.
const fs = require('fs')
const path = require('path')

const workerPath = path.join(__dirname, '../node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js')

if (!fs.existsSync(workerPath)) {
  console.log('patch-ffmpeg: worker.js not found, skipping.')
  process.exit(0)
}

let src = fs.readFileSync(workerPath, 'utf8')

if (src.includes('webpackIgnore')) {
  console.log('patch-ffmpeg: already patched, skipping.')
  process.exit(0)
}

// Add webpackIgnore so webpack/turbopack leave this import as native browser import()
src = src.replace(
  '/* @vite-ignore */',
  '/* @vite-ignore */ /* webpackIgnore: true */'
)

fs.writeFileSync(workerPath, src, 'utf8')
console.log('patch-ffmpeg: patched worker.js successfully.')
