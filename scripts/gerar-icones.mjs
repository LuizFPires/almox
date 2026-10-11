// Gera os ícones do PWA a partir de scripts/icone.svg. Uso: node scripts/gerar-icones.mjs
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const svg = fileURLToPath(new URL('./icone.svg', import.meta.url))
const saidas = [
  ['public/icones/icone-192.png', 192],
  ['public/icones/icone-512.png', 512],
  ['public/icones/icone-maskable-512.png', 512],
  ['app/apple-icon.png', 180],
  ['app/icon.png', 64],
]

for (const [caminho, tamanho] of saidas) {
  await sharp(svg, { density: 300 }).resize(tamanho, tamanho).png().toFile(caminho)
  console.log(caminho)
}
