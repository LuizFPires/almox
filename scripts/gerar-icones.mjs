// Gera os ícones do PWA a partir da marca do Almox Design System.
// Uso: node scripts/gerar-icones.mjs
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const marca = (arquivo) =>
  fileURLToPath(new URL(`../design-system/marca/${arquivo}`, import.meta.url))

// Caixa do símbolo em fundo grafite que ocupa todo o quadro: o sistema recorta o
// formato (maskable no Android, cantos arredondados no iPhone). A caixa fica na
// zona segura central de 60%.
const CAIXA = `
  <path d="M12 68 122 14 161 33 51 87Z" fill="#FFFFFF"/>
  <path d="M72 98 179 45 226 68 119 121Z" fill="#FFFFFF"/>
  <path d="M8 82 111 133 111 244 8 193Z" fill="#FFFFFF"/>
  <path d="M131 132 234 81 234 192 131 243Z" fill="#F4B400"/>`
const sangrado = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1F2937"/>
  <g transform="translate(256 260) scale(1.2) translate(-121 -129)">${CAIXA}</g>
</svg>`)

const saidas = [
  ['public/icones/icone-192.png', marca('almox-app.svg'), 192],
  ['public/icones/icone-512.png', marca('almox-app.svg'), 512],
  ['public/icones/icone-maskable-512.png', sangrado, 512],
  ['app/apple-icon.png', sangrado, 180],
]

for (const [caminho, origem, tamanho] of saidas) {
  await sharp(origem, { density: 300 }).resize(tamanho, tamanho).png().toFile(caminho)
  console.log(caminho)
}
