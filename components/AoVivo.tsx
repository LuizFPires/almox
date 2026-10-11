'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { criarClienteNavegador } from '@/lib/supabase/navegador'

type Props = {
  obraId: string
  /** Tabelas que, quando ganham linha nova na obra, recarregam a tela. */
  tabelas: ('movimento' | 'ocorrencia')[]
}

/**
 * Atualiza a tela quando entra um lançamento na obra (Supabase Realtime; a RLS vale aqui
 * também, então cada um só é avisado do que pode ver). Junta rajadas num recarregamento.
 */
export function AoVivo({ obraId, tabelas }: Props) {
  const router = useRouter()
  const chave = tabelas.join(',')

  useEffect(() => {
    const supabase = criarClienteNavegador()
    let espera: ReturnType<typeof setTimeout> | undefined
    const recarregar = () => {
      clearTimeout(espera)
      espera = setTimeout(() => router.refresh(), 400)
    }
    let canal: ReturnType<typeof supabase.channel> | undefined
    let encerrado = false
    // O Realtime aplica a RLS com o token de quem assina: carrega a sessão antes.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (encerrado || !data.session) return
      await supabase.realtime.setAuth(data.session.access_token)
      let c = supabase.channel(`obra-${obraId}-${chave}`)
      for (const tabela of chave.split(',')) {
        c = c.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: tabela, filter: `obra_id=eq.${obraId}` },
          recarregar,
        )
      }
      canal = c.subscribe()
    })
    return () => {
      encerrado = true
      clearTimeout(espera)
      if (canal) void supabase.removeChannel(canal)
    }
  }, [obraId, chave, router])

  return null
}
