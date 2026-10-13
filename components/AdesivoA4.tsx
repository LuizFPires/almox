import type { CSSProperties } from 'react'
import type { DadosAdesivo } from '@/lib/dominio/etiqueta'
import { layoutAdesivoA4 } from '@/lib/dominio/etiqueta-a4'
import type { TamanhoAdesivo } from '@/lib/dominio/folha-adesivos'
import { caminhoQr } from '@/lib/qr'
import { AdesivoCapacete } from './AdesivoCapacete'

const PESO = { forte: 800, medio: 600, normal: 400 } as const

/**
 * Adesivo do capacete na folha A4, em tamanho real (mm), com linha de corte tracejada.
 * Grande = o mesmo desenho da etiqueta térmica; Médio e Pequeno, `layoutAdesivoA4`.
 */
export function AdesivoA4({ tamanho, ...d }: DadosAdesivo & { tamanho: TamanhoAdesivo }) {
  if (tamanho === 'grande') return <AdesivoCapacete {...d} impressao />
  const l = layoutAdesivoA4(d, tamanho)
  const { d: caminho, tamanho: modulos } = caminhoQr(d.token)
  const mm = (v: number) => `${v}mm`
  const texto = (y: number, altura: number): CSSProperties => ({
    top: mm(y),
    left: mm(l.margemMm),
    width: mm(l.larguraMm - 2 * l.margemMm),
    fontSize: mm(altura),
  })
  return (
    <figure
      aria-label={`Adesivo de ${d.nomeCapacete}`}
      className="relative m-0 shrink-0 break-inside-avoid overflow-hidden border-[0.2mm] border-dashed border-[#9CA3AF] bg-white text-[#1F2937]"
      style={{ width: mm(l.larguraMm), height: mm(l.alturaMm) }}
    >
      <svg
        viewBox={`0 0 ${modulos} ${modulos}`}
        className="absolute"
        style={{ left: mm(l.qr.x), top: mm(l.qr.y), width: mm(l.qr.lado), height: mm(l.qr.lado) }}
        role="img"
        aria-label="QR Code do capacete (só o código, sem nome)"
        shapeRendering="crispEdges"
      >
        <path d={caminho} fill="currentColor" />
      </svg>
      {l.linhas.map((linha) => (
        <span
          key={linha.texto + linha.y}
          className="absolute truncate text-center leading-none"
          style={{ ...texto(linha.y, linha.altura), fontWeight: PESO[linha.peso] }}
        >
          {linha.texto}
        </span>
      ))}
      <span
        aria-hidden="true"
        className="absolute border-t-[0.4mm] border-[#1F2937]"
        style={{ top: mm(l.fio), left: mm(l.margemMm), width: mm(l.larguraMm - 2 * l.margemMm) }}
      />
      <span
        className="absolute flex justify-between gap-1 font-mono leading-none"
        style={texto(l.rodape.y, l.rodape.altura)}
      >
        <span className="truncate">{l.rodape.esquerda}</span>
        <span className="shrink-0">{l.rodape.direita}</span>
      </span>
    </figure>
  )
}
