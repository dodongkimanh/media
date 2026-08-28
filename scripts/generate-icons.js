// Generates PWA icons (public/icons/*.png) from an inline SVG monogram.
// Run manually with: node scripts/generate-icons.js
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const outDir = path.join(__dirname, '../public/icons')
fs.mkdirSync(outDir, { recursive: true })

function svgIcon(size, { padded = false } = {}) {
  // Maskable icons need extra safe-area padding so Android doesn't crop the "K".
  const pad = padded ? size * 0.18 : 0
  const fontSize = size - pad * 2
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#085041"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Playfair Display', serif" font-size="${fontSize * 0.62}"
        fill="#1D9E75" font-weight="700">K</text>
    </svg>`
}

async function main() {
  const targets = [
    { file: 'icon-192.png', size: 192, padded: false },
    { file: 'icon-512.png', size: 512, padded: false },
    { file: 'icon-maskable-512.png', size: 512, padded: true },
    { file: 'apple-touch-icon.png', size: 180, padded: false },
  ]

  for (const t of targets) {
    const svg = Buffer.from(svgIcon(t.size, { padded: t.padded }))
    await sharp(svg).png().toFile(path.join(outDir, t.file))
    console.log(`generate-icons: wrote ${t.file}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
