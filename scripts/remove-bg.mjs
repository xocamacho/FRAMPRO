import { Jimp } from 'jimp'

const img = await Jimp.read('public/logo-fincaxpro.png')
const threshold = 245

for (let y = 0; y < img.bitmap.height; y++) {
  for (let x = 0; x < img.bitmap.width; x++) {
    const idx = (img.bitmap.width * y + x) * 4
    const r = img.bitmap.data[idx]
    const g = img.bitmap.data[idx + 1]
    const b = img.bitmap.data[idx + 2]
    if (r >= threshold && g >= threshold && b >= threshold) {
      img.bitmap.data[idx + 3] = 0
    }
  }
}

await img.write('public/logo-fincaxpro-transparent.png')
console.log('✅ Listo: public/logo-fincaxpro-transparent.png')
