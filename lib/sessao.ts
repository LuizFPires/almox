import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
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
}

/**
 * Camada de acesso à sessão: lê o usuário logado (JWT validado), suas obras e a
 * obra escolhida. Chame dentro de um <Suspense>. Sem login → /login; sem obra → /sem-acesso.
 */
export const obterSessao = cache(async (): Promise<Sessao> => {
  const supabase = await criarClienteServidor()
  const { data: dadosClaims } = await supabase.auth.getClaims()
  const id = dadosClaims?.claims?.sub
  if (!id) redirect('/login')

  const [{ data: usuario }, { data: vinculos }] = await Promise.all([
    supabase.from('usuario').select('id, nome, email').eq('id', id).single(),
    supabase
      .from('usuario_obra')
      .select(
        'perfil, obra:obra!usuario_obra_obra_id_fkey (id, nome), empresa:empresa!usuario_obra_empresa_id_obra_id_fkey (id, nome)',
      )
      .eq('usuario_id', id),
  ])
  if (!usuario) redirect('/login')

  const obras: ObraDoUsuario[] = (vinculos ?? [])
    .filter((v) => v.obra)
    .map((v) => ({
      id: v.obra!.id,
      nome: v.obra!.nome,
      perfil: v.perfil,
      empresa: v.empresa ? { id: v.empresa.id, nome: v.empresa.nome } : null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  if (obras.length === 0) redirect('/sem-acesso')

  const escolhida = (await cookies()).get(COOKIE_OBRA)?.value
  const obraAtual = obras.find((o) => o.id === escolhida) ?? obras[0]!

  return { usuario, obras, obraAtual }
})
