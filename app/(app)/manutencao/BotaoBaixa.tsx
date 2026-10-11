'use client'

import { useState } from 'react'
import { Botao } from '@/components/Botao'

/** "Dar baixa" pede confirmação: a peça sai do estoque de vez. */
export function BotaoBaixa({ codigo }: { codigo: string }) {
  const [confirmando, setConfirmando] = useState(false)
  if (!confirmando) {
    return (
      <Botao type="button" variante="secundaria" onClick={() => setConfirmando(true)}>
        Dar baixa
      </Botao>
    )
  }
  return (
    <Botao type="submit" name="acao" value="baixada" variante="perigo">
      Confirmar baixa de {codigo}
    </Botao>
  )
}
