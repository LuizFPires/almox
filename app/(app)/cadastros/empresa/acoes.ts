'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEngenheiro } from '@/lib/acesso'
import { dataValida, validarEmail } from '@/lib/dominio/cadastros'
import { valoresDoForm, type Valores } from '@/lib/formulario'

export type EstadoEmpresa = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'dono_email' | 'encarregado_email' | 'proxima_medicao', string>>
}

const texto = (form: FormData, chave: string) => String(form.get(chave) ?? '').trim()
const ouNulo = (valor: string) => (valor === '' ? null : valor)

export async function salvarEmpresa(_: EstadoEmpresa, form: FormData): Promise<EstadoEmpresa> {
  const { supabase, obraId } = await exigirEngenheiro()
  const id = texto(form, 'id')
  const tipo = texto(form, 'tipo') === 'propria' ? 'propria' : 'empreiteira'
  const dados = {
    nome: texto(form, 'nome').replace(/\s+/g, ' '),
    tipo,
    cor: texto(form, 'cor') || '#6B7280',
    dono_nome: tipo === 'empreiteira' ? ouNulo(texto(form, 'dono_nome')) : null,
    dono_email: tipo === 'empreiteira' ? ouNulo(texto(form, 'dono_email').toLowerCase()) : null,
    encarregado_pessoa_id:
      tipo === 'empreiteira' ? ouNulo(texto(form, 'encarregado_pessoa_id')) : null,
    encarregado_email:
      tipo === 'empreiteira' ? ouNulo(texto(form, 'encarregado_email').toLowerCase()) : null,
    proxima_medicao: tipo === 'empreiteira' ? ouNulo(texto(form, 'proxima_medicao')) : null,
  } as const

  const campos: EstadoEmpresa['campos'] = {}
  if (dados.nome.length < 2) campos.nome = 'Informe o nome da empresa.'
  const erroDono = validarEmail(dados.dono_email ?? '')
  if (erroDono) campos.dono_email = erroDono
  const erroEnc = validarEmail(dados.encarregado_email ?? '')
  if (erroEnc) campos.encarregado_email = erroEnc
  if (dados.proxima_medicao && !dataValida(dados.proxima_medicao)) {
    campos.proxima_medicao = 'Data inválida.'
  }
  const valores = valoresDoForm(form)
  if (Object.keys(campos).length > 0) return { campos, valores }

  // select('id'): com id de outra obra o update não acha nada e isso precisa virar erro.
  const { data: salvo, error } = id
    ? await supabase
        .from('empresa')
        .update(dados)
        .eq('id', id)
        .eq('obra_id', obraId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('empresa')
        .insert({ ...dados, obra_id: obraId })
        .select('id')
        .maybeSingle()
  if (!error && !salvo) return { erro: 'Empresa não encontrada nesta obra.', valores }

  if (error) {
    if (error.code === '23505')
      return { campos: { nome: 'Já existe uma empresa com esse nome.' }, valores }
    if (error.code === '23514') {
      return {
        erro: 'Há acessos de consulta restritos a esta empresa. Mude esses acessos antes de torná-la própria.',
        valores,
      }
    }
    if (error.code === '23503')
      return { erro: 'O encarregado precisa ser uma pessoa desta empresa.', valores }
    return { erro: 'Não foi possível salvar. Tente de novo.', valores }
  }

  revalidatePath('/cadastros/empresas')
  redirect('/cadastros/empresas')
}
