'use client'

import { Botao } from '@/components/Botao'
import { sair } from '../../login/acoes'
import { desativarNotificacoes } from './acoes'

/**
 * Sair também desliga a notificação deste aparelho: num celular compartilhado, quem entrar
 * depois não recebe os avisos (empresa e valores) do login anterior.
 */
export function BotaoSair() {
  const sairDaqui = async () => {
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
    await sair()
  }
  return (
    <form action={sairDaqui} className="mt-auto">
      <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
        Sair
      </Botao>
    </form>
  )
}
