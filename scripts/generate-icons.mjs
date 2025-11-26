import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true })

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Read SVG files
const iconSvg = readFileSync(join(iconsDir, 'icon.svg'))
const maskableSvg = readFileSync(join(iconsDir, 'icon-maskable.svg'))

console.log('🎨 Generating PWA icons...\n')

// Generate regular icons
for (const size of sizes) {
  await sharp(iconSvg)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`))
  console.log(`✅ Generated icon-${size}.png`)
}

// Generate maskable icons (192 and 512)
for (const size of [192, 512]) {
  await sharp(maskableSvg)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-maskable-${size}.png`))
  console.log(`✅ Generated icon-maskable-${size}.png`)
}

// Generate Apple touch icon (180x180)
await sharp(iconSvg)
  .resize(180, 180)
  .png()
  .toFile(join(iconsDir, 'apple-touch-icon.png'))
console.log(`✅ Generated apple-touch-icon.png`)

// Generate favicon (32x32)
await sharp(iconSvg)
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, 'favicon.png'))
console.log(`✅ Generated favicon.png`)

// Generate favicon.ico (16x16 and 32x32)
await sharp(iconSvg)
  .resize(32, 32)
  .toFormat('png')
  .toFile(join(publicDir, 'favicon-32.png'))

console.log(`\n🎉 All icons generated successfully!`)
