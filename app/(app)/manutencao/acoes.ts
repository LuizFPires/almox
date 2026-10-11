'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** "Voltou do conserto" (quem lança) ou "Dar baixa" (engenheiro); o banco confere o perfil. */
export async function concluirManutencao(form: FormData) {
  const { obraAtual } = await obterSessao()
  const acao = form.get('acao') === 'baixada' ? 'baixada' : 'consertada'
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('concluir_manutencao', {
    p_obra: obraAtual.id,
    p_unidade: String(form.get('unidade') ?? ''),
    p_acao: acao,
  })
  revalidatePath('/manutencao')
  revalidatePath('/inicio')
  if (error) {
    const motivo = error.code === '42501' ? 'permissao' : error.code === 'P0002' ? 'saiu' : 'falhou'
    redirect(`/manutencao?erro=${motivo}`)
  }
}
