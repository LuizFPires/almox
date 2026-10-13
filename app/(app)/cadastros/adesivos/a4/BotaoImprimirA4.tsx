'use client'

import { useState } from 'react'
import { Botao } from '@/components/Botao'
import { marcarImpressos } from './acoes'

type Etapa = 'imprimir' | 'conferir' | 'marcando' | 'marcado' | 'erro'

/**
 * Abre a janela de impressão no toque (o iPhone exige) e só marca os adesivos como impressos
 * depois que a pessoa confirma que as folhas saíram certas: impressão cancelada ou na escala
 * errada não tira ninguém do lote.
 */
export function BotaoImprimirA4({ pessoas, folhas }: { pessoas: string[]; folhas: number }) {
  const [etapa, setEtapa] = useState<Etapa>('imprimir')
  const rotulo = `Imprimir ${folhas} ${folhas === 1 ? 'folha' : 'folhas'} A4`

  async function marcar() {
    setEtapa('marcando')
    const { ok } = await marcarImpressos(pessoas)
    setEtapa(ok ? 'marcado' : 'erro')
  }

  if (etapa === 'marcado') {
    return (
      <p
        role="status"
        className="rounded-cartao bg-sucesso-claro px-4 py-3 text-[15px] font-semibold text-sucesso"
      >
        Pronto: {pessoas.length} {pessoas.length === 1 ? 'adesivo marcado' : 'adesivos marcados'}{' '}
        como impressos. Recorte e cole nos capacetes.
      </p>
    )
  }

  if (etapa !== 'imprimir') {
    return (
      <div className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3.5">
        <span className="text-[15px] font-bold">As folhas saíram certas?</span>
        <span className="text-[13px] text-texto-2">
          Meça um adesivo: 6 × 8 cm. Só confirme depois de imprimir.
        </span>
        {etapa === 'erro' && (
          <span role="alert" className="text-sm font-semibold text-erro">
            Não foi possível marcar. Confira a internet e toque de novo.
          </span>
        )}
        <div className="flex gap-2">
          <Botao
            variante="sucesso"
            className="flex-1"
            disabled={etapa === 'marcando'}
            onClick={() => void marcar()}
          >
            {etapa === 'marcando' ? 'Marcando…' : 'Sim, saíram certas'}
          </Botao>
          <Botao variante="secundaria" onClick={() => window.print()}>
            Imprimir de novo
          </Botao>
        </div>
      </div>
    )
  }

  return (
    <Botao
      tamanho="g"
      larguraTotal
      onClick={() => {
        window.print()
        setEtapa('conferir')
      }}
    >
      {rotulo}
    </Botao>
  )
}
