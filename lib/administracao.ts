import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * Primeira linha das telas e ações da Administração. Não depende de obra ativa (o
 * administrador entra mesmo com todas as obras dele desativadas). As funções `admin_*` do
 * banco repetem a checagem; aqui quem não é administrador nem vê que a tela existe.
 */
export const exigirAdministrador = cache(async () => {
  await connection()
  const supabase = await criarClienteServidor()
  const { data: dadosClaims } = await supabase.auth.getClaims()
  const id = dadosClaims?.claims?.sub
  if (!id) redirect('/login')
  const appMetadata = dadosClaims.claims.app_metadata as Record<string, unknown> | undefined
  if (appMetadata?.trocar_senha) redirect('/trocar-senha')

  const [resAdmin, resUsuario] = await Promise.all([
    supabase.from('administrador').select('usuario_id').eq('usuario_id', id).maybeSingle(),
    supabase.from('usuario').select('id, nome').eq('id', id).maybeSingle(),
  ])
  if (resAdmin.error || resUsuario.error) {
    throw new Error('Não foi possível carregar a sua sessão. Tente de novo.')
  }
  if (!resAdmin.data || !resUsuario.data) notFound()
  return { supabase, usuario: resUsuario.data }
})
