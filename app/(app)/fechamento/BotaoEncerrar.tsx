'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { encerrarDia, type EstadoEncerrar } from './acoes'

/** "Encerrar o dia e enviar relatório" (sem confirmação, como no protótipo: não dá baixa). */
export function BotaoEncerrar() {
  const [estado, acao, encerrando] = useActionState(
    async (): Promise<EstadoEncerrar> => encerrarDia(),
    {},
  )
  return (
    <form action={acao} className="flex flex-col gap-2">
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" variante="escura" tamanho="g" larguraTotal disabled={encerrando}>
        {encerrando ? 'Encerrando…' : 'Encerrar o dia e enviar relatório'}
      </Botao>
    </form>
  )
}
