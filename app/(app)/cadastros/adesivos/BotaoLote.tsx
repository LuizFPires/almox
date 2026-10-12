'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { imprimirLote, type EstadoLote } from './acoes'

/** "Imprimir N adesivos": manda todos para a fila do agente de uma vez. */
export function BotaoLote({ pessoas, volta }: { pessoas: string[]; volta: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLote, FormData>(imprimirLote, {})
  const n = pessoas.length
  return (
    <form action={acao} className="flex flex-col gap-2.5">
      <input type="hidden" name="pessoas" value={pessoas.join(',')} />
      <input type="hidden" name="volta" value={volta} />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={enviando}>
        {enviando ? 'Mandando para a fila…' : `Imprimir ${n} ${n === 1 ? 'adesivo' : 'adesivos'}`}
      </Botao>
    </form>
  )
}
