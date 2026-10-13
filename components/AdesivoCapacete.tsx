import type { CSSProperties } from 'react'
import { layoutAdesivo } from '@/lib/dominio/etiqueta'
import { caminhoQr } from '@/lib/qr'

type Props = {
  /** Token opaco: única coisa dentro do QR (RN-17). */
  token: string
  nomeCapacete: string
  nomeCompleto: string
  funcao: string
  empresa: string
  obra: string
  matricula: string
  /**
   * Tamanho real para imprimir na folha A4 (60 × 80 mm, em mm, com linha de corte); sem ele, a
   * prévia na tela em px.
   */
  impressao?: boolean
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
  // Unidade por ponto da impressora: px na prévia, mm no papel (60 mm de largura).
  const u = p.impressao ? 'mm' : 'px'
  const e = (p.impressao ? 60 : LARGURA_PREVIA) / l.largura
  const m = (pontos: number) => `${pontos * e}${u}`
  const texto = (y: number, altura: number): CSSProperties => ({
    top: m(y),
    left: m(l.margem),
    width: m(l.larguraTexto),
    fontSize: m(altura),
  })
  const ladoQr = m(tamanho * l.qr.ampliacao)
  return (
    <figure
      aria-label={`Prévia do adesivo de ${p.nomeCapacete}`}
      className={`relative shrink-0 overflow-hidden bg-white text-[#1F2937] ${
        p.impressao
          ? 'm-0 break-inside-avoid border-[0.2mm] border-dashed border-[#9CA3AF]'
          : 'mx-auto rounded-cartao shadow-md'
      }`}
      style={{ width: m(l.largura), height: m(l.altura) }}
    >
      <svg
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="absolute"
        style={{ left: m(l.qr.x), top: m(l.qr.y), width: ladoQr, height: ladoQr }}
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
        style={{ top: m(l.linha.y), left: m(l.margem), width: m(l.larguraTexto) }}
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
