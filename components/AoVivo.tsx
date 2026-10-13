'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { esperaAtualizacao } from '@/lib/dominio/ao-vivo'
import { criarClienteNavegador } from '@/lib/supabase/navegador'

type Props = {
  obraId: string
  /** Tabelas que, quando mudam na obra, recarregam a tela. */
  tabelas: (keyof typeof EVENTOS)[]
}

/** Lançamentos só entram (imutáveis); a unidade muda de situação (livre, em uso, manutenção…). */
const EVENTOS = {
  movimento: 'INSERT',
  ocorrencia: 'INSERT',
  unidade: '*',
} as const

/**
 * Atualiza a tela quando entra um lançamento na obra (Supabase Realtime; a RLS vale aqui
 * também, então cada um só é avisado do que pode ver). Junta rajadas num recarregamento, mas
 * com movimento sem parar atualiza pelo menos a cada 3 s; aba escondida atualiza ao voltar.
 */
export function AoVivo({ obraId, tabelas }: Props) {
  const router = useRouter()
  const chave = tabelas.join(',')

  useEffect(() => {
    const supabase = criarClienteNavegador()
    let espera: ReturnType<typeof setTimeout> | undefined
    // Primeiro evento ainda não mostrado: com lançamentos sem parar, atualiza no prazo máximo.
    let primeiro: number | null = null
    // Chegou evento com a aba escondida: atualiza quando ela voltar a aparecer.
    let pendente = false
    const atualizar = () => {
      primeiro = null
      if (document.hidden) {
        pendente = true
        return
      }
      router.refresh()
    }
    const recarregar = () => {
      const agora = Date.now()
      primeiro ??= agora
      clearTimeout(espera)
      espera = setTimeout(atualizar, esperaAtualizacao(agora, primeiro))
    }
    const aoMostrar = () => {
      if (!document.hidden && pendente) {
        pendente = false
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', aoMostrar)
    let canal: ReturnType<typeof supabase.channel> | undefined
    let encerrado = false
    // O Realtime aplica a RLS com o token de quem assina: carrega a sessão antes.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (encerrado || !data.session) return
      await supabase.realtime.setAuth(data.session.access_token)
      if (encerrado) return
      // Tópico único por montagem: o realtime-js reaproveita canal de mesmo nome, e um canal
      // antigo ainda saindo deixaria a tela sem tempo real.
      let c = supabase.channel(`obra-${obraId}-${chave}-${crypto.randomUUID()}`)
      for (const tabela of chave.split(',') as (keyof typeof EVENTOS)[]) {
        c = c.on(
          'postgres_changes',
          {
            event: EVENTOS[tabela],
            schema: 'public',
            table: tabela,
            filter: `obra_id=eq.${obraId}`,
          },
          recarregar,
        )
      }
      canal = c.subscribe()
    })
    return () => {
      encerrado = true
      clearTimeout(espera)
      document.removeEventListener('visibilitychange', aoMostrar)
      if (canal) void supabase.removeChannel(canal)
    }
  }, [obraId, chave, router])

  return null
}
