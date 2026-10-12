'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { formatarBRL } from '@/lib/formatos/moeda'
import { encerrarDia, type EstadoEncerrar } from './acoes'

/**
 * "Encerrar o dia e enviar relatório". Pede confirmação: não dá baixa em nada, mas manda
 * aviso com valor às empreiteiras e não se desfaz (decisão da revisão do M9).
 */
export function BotaoEncerrar({ empreiteiras, total }: { empreiteiras: number; total: number }) {
  const [confirmando, setConfirmando] = useState(false)
  const [estado, acao, encerrando] = useActionState(
    async (): Promise<EstadoEncerrar> => encerrarDia(),
    {},
  )

  if (!confirmando) {
    return (
      <Botao
        type="button"
        variante="escura"
        tamanho="g"
        larguraTotal
        onClick={() => setConfirmando(true)}
      >
        Encerrar o dia e enviar relatório
      </Botao>
    )
  }
  return (
    <form action={acao} className="flex flex-col gap-2">
      <p role="alert" className="text-[15px]">
        {empreiteiras > 0 ? (
          <>
            Vai mandar aviso a{' '}
            <b>
              {empreiteiras} {empreiteiras === 1 ? 'empreiteira' : 'empreiteiras'}
            </b>{' '}
            ({formatarBRL(total)} a descontar). Nada sai do nome de ninguém. Não dá para desfazer.
          </>
        ) : (
          'Nenhuma empreiteira com ferramenta fora: só o relatório do dia. Não dá para desfazer.'
        )}
      </p>
      <ErroFormulario mensagem={estado.erro} />
      <div className="grid grid-cols-2 gap-2">
        <Botao
          type="button"
          variante="secundaria"
          tamanho="g"
          disabled={encerrando}
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </Botao>
        <Botao type="submit" variante="escura" tamanho="g" disabled={encerrando}>
          {encerrando ? 'Encerrando…' : 'Sim, encerrar'}
        </Botao>
      </div>
    </form>
  )
}
