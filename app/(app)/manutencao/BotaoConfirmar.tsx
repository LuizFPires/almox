'use client'

import { useState } from 'react'
import { Botao } from '@/components/Botao'

type Props = {
  rotulo: string
  confirmar: string
  acao: 'consertada' | 'baixada'
  variante: 'sucesso' | 'perigo'
}

/** Ação sem volta na manutenção: pede confirmação, com "Cancelar". */
export function BotaoConfirmar({ rotulo, confirmar, acao, variante }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  if (!confirmando) {
    return (
      <Botao type="button" variante="secundaria" larguraTotal onClick={() => setConfirmando(true)}>
        {rotulo}
      </Botao>
    )
  }
  return (
    <span className="flex flex-col gap-1.5">
      <Botao type="submit" name="acao" value={acao} variante={variante} larguraTotal>
        {confirmar}
      </Botao>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="min-h-toque text-sm font-semibold underline"
      >
        Cancelar
      </button>
    </span>
  )
}
