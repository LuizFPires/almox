/**
 * Foto da avaria comprimida no celular antes do envio: lado maior até 1280 px, JPEG ~70%.
 * Uma foto de câmera de 4–8 MB vira algo como 150–300 KB (internet da obra é fraca).
 */
export async function comprimirFoto(
  arquivo: File,
  ladoMaximo = 1280,
  qualidade = 0.7,
): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height))
  const largura = Math.round(imagem.width * escala)
  const altura = Math.round(imagem.height * escala)
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const contexto = tela.getContext('2d')
  if (!contexto) throw new Error('Não foi possível preparar a foto.')
  contexto.drawImage(imagem, 0, 0, largura, altura)
  imagem.close()
  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível preparar a foto.'))),
      'image/jpeg',
      qualidade,
    ),
  )
}
