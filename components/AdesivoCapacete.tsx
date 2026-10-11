import QRCode from 'qrcode'
import type { CSSProperties } from 'react'
import { layoutAdesivo } from '@/lib/dominio/etiqueta'

type Props = {
  /** Token opaco: única coisa dentro do QR (RN-17). */
  token: string
  nomeCapacete: string
  nomeCompleto: string
  funcao: string
  empresa: string
  obra: string
  matricula: string
}

/** Desenha o QR como um único path SVG (sem HTML injetado). */
function caminhoQr(token: string) {
  // Um segmento só de bytes, como no adesivo impresso (o modo automático pode misturar
  // segmentos que alguns leitores não leem).
  const { modules } = QRCode.create([{ data: new TextEncoder().encode(token), mode: 'byte' }], {
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

/** Largura da prévia na tela (px); a altura segue os 60 × 80 mm do adesivo. */
const LARGURA_PREVIA = 260

/**
 * Prévia do adesivo 60 × 80 mm, desenhada com as mesmas posições e tamanhos do que sai
 * na impressora (`layoutAdesivo`): nome comprido encolhe igual, obra comprida corta igual.
 */
export function AdesivoCapacete(p: Props) {
  const { d, tamanho } = caminhoQr(p.token)
  const l = layoutAdesivo(p)
  const e = LARGURA_PREVIA / l.largura // px por ponto da impressora
  const texto = (y: number, altura: number): CSSProperties => ({
    top: y * e,
    left: l.margem * e,
    width: l.larguraTexto * e,
    fontSize: altura * e,
  })
  const ladoQr = tamanho * l.qr.ampliacao * e
  return (
    <figure
      aria-label={`Prévia do adesivo de ${p.nomeCapacete}`}
      className="relative mx-auto shrink-0 overflow-hidden rounded-cartao bg-white text-[#1F2937] shadow-md"
      style={{ width: LARGURA_PREVIA, height: l.altura * e }}
    >
      <svg
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="absolute"
        style={{ left: l.qr.x * e, top: l.qr.y * e, width: ladoQr, height: ladoQr }}
        role="img"
        aria-label="QR Code do capacete (só o código, sem nome)"
        shapeRendering="crispEdges"
      >
        <path d={d} fill="currentColor" />
      </svg>
      <span
        className="absolute truncate text-center leading-none font-extrabold"
        style={texto(l.capacete.y, l.capacete.altura)}
      >
        {l.capacete.texto}
      </span>
      <span
        className="absolute truncate text-center leading-tight font-semibold"
        style={texto(l.nome.y, l.nome.altura)}
      >
        {l.nome.texto}
      </span>
      <span
        className="absolute line-clamp-2 text-center leading-tight"
        style={texto(l.funcao.y, l.funcao.altura)}
      >
        {l.funcao.texto}
      </span>
      <span
        className="absolute border-t-2 border-[#1F2937]"
        style={{ top: l.linha.y * e, left: l.margem * e, width: l.larguraTexto * e }}
      />
      <span
        className="absolute flex justify-between font-mono leading-none"
        style={texto(l.rodape.y, l.rodape.altura)}
      >
        <span>{l.rodape.esquerda}</span>
        <span>{l.rodape.direita}</span>
      </span>
    </figure>
  )
}
