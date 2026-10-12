'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { endpointPushValido } from '@/lib/envios/endpoint'
import { COOKIE_OBRA, obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Troca a obra ativa. Só aceita obras às quais o usuário tem acesso. */
export async function escolherObra(form: FormData) {
  const obraId = String(form.get('obra') ?? '')
  const { obras } = await obterSessao()
  if (!obras.some((o) => o.id === obraId)) redirect('/conta')

  ;(await cookies()).set(COOKIE_OBRA, obraId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/inicio')
}

export type ResultadoNotificacao = { erro?: string }

/** Guarda a inscrição de notificação deste aparelho para o login (RLS: só a própria). */
export async function ativarNotificacoes(inscricao: {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}): Promise<ResultadoNotificacao> {
  const { usuario } = await obterSessao()
  const endpoint = inscricao.endpoint ?? ''
  const p256dh = inscricao.keys?.p256dh ?? ''
  const auth = inscricao.keys?.auth ?? ''
  if (!endpointPushValido(endpoint) || !p256dh || !auth) {
    return { erro: 'Este navegador não entregou uma inscrição válida.' }
  }
  const supabase = await criarClienteServidor()
  const { error } = await supabase
    .from('inscricao_push')
    .upsert({ endpoint, p256dh, auth, usuario_id: usuario.id }, { onConflict: 'endpoint' })
  if (error) {
    return {
      erro: 'Não foi possível ativar. Se outro login usa este aparelho, desative lá primeiro.',
    }
  }
  return {}
}

/** Tira a inscrição deste aparelho. */
export async function desativarNotificacoes(endpoint: string): Promise<ResultadoNotificacao> {
  const supabase = await criarClienteServidor()
  const { error } = await supabase.from('inscricao_push').delete().eq('endpoint', endpoint)
  if (error) return { erro: 'Não foi possível desativar. Tente de novo.' }
  return {}
}
