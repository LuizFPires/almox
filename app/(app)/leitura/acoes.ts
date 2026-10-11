'use server'

import { redirect } from 'next/navigation'
import type { SituacaoLeitura } from '@/lib/dominio/leitura'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type PessoaLida = {
  nomeCapacete: string
  nome: string
  funcao: string
  empresa: string
  empresaCor: string
}

export type Leitura =
  | { situacao: 'ok'; pessoa: PessoaLida }
  | { situacao: Exclude<SituacaoLeitura, 'ok'> }
  | { situacao: 'falhou' }

/** O QR do capacete só tem o token (RN-17); qualquer coisa muito maior não é token. */
const tokenLido = (texto: string) => texto.trim().slice(0, 200)

/**
 * Leu um capacete. Quem lança segue para a conferência (o token fica só na memória da
 * tela); a consulta vai direto para a ficha (F-02).
 */
export async function lerCapacete(texto: string): Promise<Leitura> {
  const { obraAtual } = await obterSessao()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .rpc('ler_capacete', { p_obra: obraAtual.id, p_token: tokenLido(texto) })
    .maybeSingle()
  if (error || !data) return { situacao: 'falhou' }
  if (data.situacao !== 'ok' || !data.pessoa_id) {
    return { situacao: data.situacao as Exclude<SituacaoLeitura, 'ok'> }
  }
  if (!podeLancar(obraAtual.perfil)) redirect(`/pessoa/${data.pessoa_id}?via=qr`)
  return {
    situacao: 'ok',
    pessoa: {
      nomeCapacete: data.nome_capacete ?? '',
      nome: data.nome ?? '',
      funcao: data.funcao ?? '',
      empresa: data.empresa ?? '',
      empresaCor: data.empresa_cor ?? '#6B7280',
    },
  }
}

/**
 * "Sim, é o …": grava a conferência (10 min) e abre a ficha levando o id da identificação;
 * o servidor confere esse id (dono, pessoa, obra, validade) antes de aceitar lançar com QR.
 */
export async function confirmarPessoa(texto: string): Promise<{ erro: string }> {
  const { obraAtual } = await obterSessao()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .rpc('conferir_pessoa', { p_obra: obraAtual.id, p_token: tokenLido(texto) })
    .maybeSingle()
  if (error || !data) return { erro: 'Não foi possível confirmar. Leia o capacete de novo.' }
  redirect(`/pessoa/${data.pessoa_id}?ident=${data.identificacao}`)
}

/** "Não é ele" (RN-04): nada é lançado; só a ocorrência fica anotada. */
export async function naoEhEle(texto: string): Promise<{ ok: boolean }> {
  const { obraAtual } = await obterSessao()
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('registrar_ocorrencia', {
    p_obra: obraAtual.id,
    p_token: tokenLido(texto),
  })
  return { ok: !error }
}
