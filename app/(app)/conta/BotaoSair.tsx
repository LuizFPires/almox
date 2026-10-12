'use client'

import { useState } from 'react'
import { Botao } from '@/components/Botao'
import { apagarTudo, listarFila } from '@/lib/offline/banco'
import { sair } from '../../login/acoes'
import { desativarNotificacoes } from './acoes'

/**
 * Sair também desliga a notificação deste aparelho: num celular compartilhado, quem entrar
 * depois não recebe os avisos (empresa e valores) do login anterior. E apaga o que o celular
 * guardou para lançar sem internet (pessoas e fila); com lançamento ainda não enviado, avisa
 * antes e só sai no segundo toque.
 */
export function BotaoSair() {
  const [naFila, setNaFila] = useState<number | null>(null)

  const sairDaqui = async () => {
    if (naFila === null) {
      const pendentes = await listarFila()
        .then((f) => f.filter((i) => i.situacao === 'aguardando').length)
        .catch(() => 0)
      if (pendentes > 0) {
        setNaFila(pendentes)
        return
      }
    }
    try {
      if ('serviceWorker' in navigator) {
        const registro = await navigator.serviceWorker.getRegistration()
        const inscricao = await registro?.pushManager.getSubscription()
        if (inscricao) {
          await desativarNotificacoes(inscricao.endpoint)
          await inscricao.unsubscribe()
        }
      }
    } catch {
      // sem notificação neste aparelho: segue saindo
    }
    await apagarTudo().catch(() => undefined)
    await sair()
  }
  return (
    <form action={sairDaqui} className="mt-auto flex flex-col gap-2.5">
      {naFila !== null && (
        <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3 text-[15px] text-erro">
          <b>
            {naFila}{' '}
            {naFila === 1
              ? 'lançamento ainda não foi enviado'
              : 'lançamentos ainda não foram enviados'}
            .
          </b>{' '}
          Sair apaga a fila deste celular. Espere a internet voltar para enviar, ou toque de novo
          para sair mesmo assim.
        </p>
      )}
      <Botao
        type="submit"
        variante={naFila !== null ? 'perigo' : 'secundaria'}
        tamanho="g"
        larguraTotal
      >
        {naFila !== null ? 'Sair e apagar a fila' : 'Sair'}
      </Botao>
    </form>
  )
}
