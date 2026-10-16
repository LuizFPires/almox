import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import type { Perfil } from '@/lib/dominio/permissoes'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const COOKIE_OBRA = 'almox_obra'

export type ObraDoUsuario = {
  id: string
  nome: string
  perfil: Perfil
  /** Preenchido para consulta de empreiteira: vê só esta empresa. */
  empresa: { id: string; nome: string } | null
}

export type Sessao = {
  usuario: { id: string; nome: string; email: string }
  obras: ObraDoUsuario[]
  obraAtual: ObraDoUsuario
  /** Administrador: cria e encerra obras e gera senha de qualquer obra (Administração). */
  administrador: boolean
}

/**
 * Camada de acesso à sessão: lê o usuário logado (JWT validado), suas obras e a
 * obra escolhida. Chame dentro de um <Suspense>. Sem login → /login; sem obra → /sem-acesso.
 * Obra desativada ou encerrada pelo administrador não aparece (os dados continuam no banco).
 * Falha ao consultar o banco vira erro (tela de erro), nunca redirecionamento: o proxy
 * mandaria de /login de volta para /inicio e o usuário ficaria preso num laço.
 */
export const obterSessao = cache(async (): Promise<Sessao> => {
  // Sessão é sempre da requisição: o cliente do Supabase usa Date.now() para validar o JWT.
  await connection()
  const supabase = await criarClienteServidor()
  const { data: dadosClaims } = await supabase.auth.getClaims()
  const id = dadosClaims?.claims?.sub
  if (!id) redirect('/login')
  // Senha provisória: só entra no app depois de criar a própria (M2).
  const appMetadata = dadosClaims.claims.app_metadata as Record<string, unknown> | undefined
  if (appMetadata?.trocar_senha) redirect('/trocar-senha')
  const email = typeof dadosClaims?.claims?.email === 'string' ? dadosClaims.claims.email : ''

  const [resUsuario, resVinculos, resAdmin] = await Promise.all([
    supabase.from('usuario').select('id, nome').eq('id', id).maybeSingle(),
    supabase
      .from('usuario_obra')
      .select(
        'perfil, obra:obra!usuario_obra_obra_id_fkey (id, nome, ativa), empresa:empresa!usuario_obra_empresa_id_obra_id_fkey (id, nome)',
      )
      .eq('usuario_id', id),
    supabase.from('administrador').select('usuario_id').eq('usuario_id', id).maybeSingle(),
  ])
  if (resUsuario.error || resVinculos.error || resAdmin.error) {
    throw new Error('Não foi possível carregar a sua sessão. Tente de novo.')
  }
  if (!resUsuario.data) redirect('/sem-acesso')
  const usuario = { ...resUsuario.data, email }
  const vinculos = resVinculos.data

  const obras: ObraDoUsuario[] = (vinculos ?? [])
    .filter((v) => v.obra?.ativa)
    .map((v) => ({
      id: v.obra!.id,
      nome: v.obra!.nome,
      perfil: v.perfil,
      empresa: v.empresa ? { id: v.empresa.id, nome: v.empresa.nome } : null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const administrador = Boolean(resAdmin.data)
  // Administrador sem obra ativa: a Administração não depende de obra.
  if (obras.length === 0) redirect(administrador ? '/administracao' : '/sem-acesso')

  const escolhida = (await cookies()).get(COOKIE_OBRA)?.value
  const obraAtual = obras.find((o) => o.id === escolhida) ?? obras[0]!

  return { usuario, obras, obraAtual, administrador }
})
