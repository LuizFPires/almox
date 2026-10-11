'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEngenheiro } from '@/lib/acesso'
import { enfileirarAdesivo, MENSAGEM_FALHA } from '@/lib/dados/adesivo'
import {
  normalizarNomeCapacete,
  sugerirNomeCapacete,
  validarNomeCompleto,
} from '@/lib/dominio/cadastros'
import { lerCopias } from '@/lib/dominio/impressao'
import { valoresDoForm, type Valores } from '@/lib/formulario'

export type EstadoPessoa = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'nome_capacete' | 'funcao' | 'empresa_id', string>>
}

const texto = (form: FormData, chave: string) =>
  String(form.get(chave) ?? '')
    .replace(/\s+/g, ' ')
    .trim()

export async function salvarPessoa(_: EstadoPessoa, form: FormData): Promise<EstadoPessoa> {
  const { supabase, obraId } = await exigirEngenheiro()
  const id = texto(form, 'id')
  const funcaoEscolhida = texto(form, 'funcao')
  const dados = {
    nome: texto(form, 'nome'),
    // Vazio (ex.: digitou antes da página carregar a sugestão): usa o primeiro nome.
    nome_capacete:
      normalizarNomeCapacete(texto(form, 'nome_capacete')) ||
      sugerirNomeCapacete(texto(form, 'nome')),
    funcao: funcaoEscolhida === 'Outra' ? texto(form, 'funcao_outra') : funcaoEscolhida,
    empresa_id: texto(form, 'empresa_id'),
  }

  const campos: EstadoPessoa['campos'] = {}
  const erroNome = validarNomeCompleto(dados.nome)
  if (erroNome) campos.nome = erroNome
  if (!dados.nome_capacete) campos.nome_capacete = 'Informe o nome que vai no capacete.'
  if (dados.funcao.length < 2) campos.funcao = 'Escolha ou escreva a função.'
  if (!dados.empresa_id) campos.empresa_id = 'Escolha a empresa.'
  const valores = valoresDoForm(form)
  if (Object.keys(campos).length > 0) return { campos, valores }

  // select('id'): com id de outra obra o update não acha nada e isso precisa virar erro.
  const { data: salva, error } = id
    ? await supabase
        .from('pessoa')
        .update(dados)
        .eq('id', id)
        .eq('obra_id', obraId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('pessoa')
        .insert({ ...dados, obra_id: obraId })
        .select('id')
        .maybeSingle()
  if (error) {
    if (error.code === '23503')
      return { campos: { empresa_id: 'Empresa inválida para esta obra.' }, valores }
    return { erro: 'Não foi possível salvar. Tente de novo.', valores }
  }
  if (!salva) return { erro: 'Pessoa não encontrada nesta obra.', valores }

  revalidatePath('/cadastros/pessoas')
  // "Salvar e imprimir adesivo": a pessoa já está salva; a falha na fila só vira aviso.
  if (!id && form.get('imprimir') === '1') {
    const fila = await enfileirarAdesivo(supabase, obraId, salva.id, 1)
    redirect(`/cadastros/pessoa/${salva.id}?adesivo=${fila.ok ? 'fila' : fila.motivo}`)
  }
  redirect('/cadastros/pessoas')
}

export type EstadoReimpressao = { erro?: string; aviso?: string }

/** "Reimprimir" na ficha da pessoa: 1 a 5 cópias do mesmo adesivo (mesmo token). */
export async function reimprimirAdesivo(
  _: EstadoReimpressao,
  form: FormData,
): Promise<EstadoReimpressao> {
  const { supabase, obraId } = await exigirEngenheiro()
  const copias = lerCopias(String(form.get('copias') ?? ''))
  if (!copias) return { erro: 'Escolha de 1 a 5 cópias.' }
  const fila = await enfileirarAdesivo(supabase, obraId, String(form.get('id') ?? ''), copias)
  if (!fila.ok) return { erro: MENSAGEM_FALHA[fila.motivo] }
  revalidatePath('/cadastros/pessoa/[id]', 'page')
  return { aviso: copias === 1 ? 'Adesivo na fila.' : `${copias} adesivos na fila.` }
}

/** Inativar não apaga: a pessoa some das listas de lançamento, o histórico fica. */
export async function alternarAtiva(form: FormData) {
  const { supabase, obraId } = await exigirEngenheiro()
  const id = String(form.get('id') ?? '')
  const ativa = form.get('ativa') === 'true'
  const { data, error } = await supabase
    .from('pessoa')
    .update({ ativa })
    .eq('id', id)
    .eq('obra_id', obraId)
    .select('id')
    .maybeSingle()
  if (error || !data) redirect(`/cadastros/pessoa/${id}?erro=situacao`)
  revalidatePath('/cadastros/pessoas')
  redirect('/cadastros/pessoas')
}
