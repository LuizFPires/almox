import QRCode from 'qrcode'

/**
 * Desenha o QR como um único path SVG (sem HTML injetado), num segmento só de bytes, como no
 * adesivo impresso (o modo automático pode misturar segmentos que alguns leitores não leem).
 */
export function caminhoQr(texto: string): { d: string; tamanho: number } {
  const { modules } = QRCode.create([{ data: new TextEncoder().encode(texto), mode: 'byte' }], {
    errorCorrectionLevel: 'M',
  })
  let d = ''
  for (let linha = 0; linha < modules.size; linha++) {
    for (let coluna = 0; coluna < modules.size; coluna++) {
      if (modules.get(linha, coluna)) d += `M${coluna} ${linha}h1v1h-1z`
    }
  }
  return { d, tamanho: modules.size }
}
