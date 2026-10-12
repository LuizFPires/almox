'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { imprimirLote, type EstadoLote } from './acoes'

/** "Imprimir N adesivos": manda o próximo lote de quem ainda não tem para a fila do agente. */
export function BotaoLote({
  quantidade,
  empresa,
  volta,
}: {
  quantidade: number
  empresa: string | null
  volta: string
}) {
  const [estado, acao, enviando] = useActionState<EstadoLote, FormData>(imprimirLote, {})
  return (
    <form action={acao} className="flex flex-col gap-2.5">
      {empresa && <input type="hidden" name="empresa" value={empresa} />}
      <input type="hidden" name="volta" value={volta} />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={enviando}>
        {enviando
          ? 'Mandando para a fila…'
          : `Imprimir ${quantidade} ${quantidade === 1 ? 'adesivo' : 'adesivos'}`}
      </Botao>
    </form>
  )
}
