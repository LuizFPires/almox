/**
 * Foto da avaria comprimida no celular antes do envio: lado maior até 1280 px, JPEG ~70%.
 * Uma foto de câmera de 4–8 MB vira algo como 150–300 KB (internet da obra é fraca).
 */
export async function comprimirFoto(
  arquivo: File,
  /** Texto gravado no pé da foto (ferramenta · data e hora · quem fotografou). */
  carimbo?: string,
  ladoMaximo = 1280,
  qualidade = 0.7,
): Promise<Blob> {
  const imagem = await abrirImagem(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height))
  const largura = Math.round(imagem.width * escala)
  const altura = Math.round(imagem.height * escala)
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const contexto = tela.getContext('2d')
  if (!contexto) throw new Error('Não foi possível preparar a foto.')
  contexto.drawImage(imagem.fonte, 0, 0, largura, altura)
  imagem.fechar()
  if (carimbo) carimbar(contexto, carimbo, largura, altura)
  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível preparar a foto.'))),
      'image/jpeg',
      qualidade,
    ),
  )
}

/**
 * Ícone próprio de ferramenta: qualquer imagem (PNG, JPG, WebP ou SVG) vira um PNG quadrado de
 * 128 px, centralizado e com fundo transparente. Redesenhar no canvas descarta o que não for
 * imagem (scripts de SVG, metadados) e deixa o arquivo pequeno para a TV e o celular.
 */
export async function prepararIcone(arquivo: File, lado = 128): Promise<Blob> {
  const imagem = await abrirImagem(arquivo)
  if (!imagem.width || !imagem.height) {
    imagem.fechar()
    throw new Error('Imagem sem tamanho.')
  }
  const escala = Math.min(lado / imagem.width, lado / imagem.height)
  const largura = Math.round(imagem.width * escala)
  const altura = Math.round(imagem.height * escala)
  const tela = document.createElement('canvas')
  tela.width = lado
  tela.height = lado
  const contexto = tela.getContext('2d')
  if (!contexto) throw new Error('Não foi possível preparar o ícone.')
  contexto.drawImage(
    imagem.fonte,
    Math.round((lado - largura) / 2),
    Math.round((lado - altura) / 2),
    largura,
    altura,
  )
  imagem.fechar()
  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível preparar o ícone.'))),
      'image/png',
    ),
  )
}

type ImagemAberta = { fonte: CanvasImageSource; width: number; height: number; fechar: () => void }

/**
 * Abre a foto respeitando a orientação da câmera. Celulares mais antigos não aceitam
 * `imageOrientation: 'from-image'` (ou nem têm createImageBitmap): cai para `<img>`, que
 * nos navegadores atuais já aplica a orientação do EXIF.
 */
async function abrirImagem(arquivo: Blob): Promise<ImagemAberta> {
  for (const opcoes of [{ imageOrientation: 'from-image' } as const, undefined]) {
    try {
      if (typeof createImageBitmap !== 'function') break
      const bitmap = await createImageBitmap(arquivo, opcoes)
      return {
        fonte: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        fechar: () => bitmap.close(),
      }
    } catch {
      // tenta o próximo jeito
    }
  }
  const url = URL.createObjectURL(arquivo)
  const img = new Image()
  img.src = url
  await img.decode()
  return {
    fonte: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    fechar: () => URL.revokeObjectURL(url),
  }
}

/** Faixa escura no pé da foto com o carimbo (fica gravado na imagem, como prova). */
function carimbar(
  contexto: CanvasRenderingContext2D,
  texto: string,
  largura: number,
  altura: number,
) {
  const faixa = Math.max(28, Math.round(altura * 0.07))
  let fonte = Math.round(faixa * 0.5)
  contexto.font = `600 ${fonte}px sans-serif`
  while (fonte > 10 && contexto.measureText(texto).width > largura - faixa) {
    fonte -= 1
    contexto.font = `600 ${fonte}px sans-serif`
  }
  contexto.fillStyle = 'rgba(16, 23, 32, 0.72)'
  contexto.fillRect(0, altura - faixa, largura, faixa)
  contexto.fillStyle = '#ffffff'
  contexto.textBaseline = 'middle'
  contexto.fillText(texto, Math.round(faixa / 2), altura - faixa / 2)
}
