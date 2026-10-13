'use client'

import { useState } from 'react'
import { Botao } from '@/components/Botao'
import { marcarImpressos } from './acoes'

/** Abre a janela de impressão do navegador e marca os adesivos como impressos. */
export function BotaoImprimirA4({ pessoas, folhas }: { pessoas: string[]; folhas: number }) {
  const [marcando, setMarcando] = useState(false)
  return (
    <Botao
      tamanho="g"
      larguraTotal
      disabled={marcando}
      onClick={() => {
        // A janela de impressão abre no toque (o iPhone exige); a marcação vai em seguida.
        window.print()
        setMarcando(true)
        void marcarImpressos(pessoas).finally(() => setMarcando(false))
      }}
    >
      {marcando ? 'Preparando…' : `Imprimir ${folhas} ${folhas === 1 ? 'folha' : 'folhas'} A4`}
    </Botao>
  )
}
