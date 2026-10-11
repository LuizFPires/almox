'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { exigirEngenheiro } from '@/lib/acesso'
import { lerValorReposicao, validarPrefixo } from '@/lib/dominio/cadastros'
import { valoresDoForm, type Valores } from '@/lib/formulario'

export type EstadoFerramenta = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'icone' | 'prefixo' | 'valor' | 'quantidade', string>>
}

const texto = (form: FormData, chave: string) =>
  String(form.get(chave) ?? '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Cria o tipo ou atualiza nome/ícone/valor/alto valor; com quantidade > 0, adiciona
 * unidades pela RPC (códigos sequenciais). Quantidade 0 só atualiza o valor.
 */
export async function salvarFerramenta(
  _: EstadoFerramenta,
  form: FormData,
): Promise<EstadoFerramenta> {
  const { supabase, obraId } = await exigirEngenheiro()
  const valores = valoresDoForm(form)
  const id = texto(form, 'id')
  const nome = texto(form, 'nome')
  const icone = texto(form, 'icone')
  const prefixo = texto(form, 'prefixo').toUpperCase()
  const valor = lerValorReposicao(texto(form, 'valor'))
  const quantidade = Number(texto(form, 'quantidade') || '0')
  const altoValor = form.get('alto_valor') === 'on'

  const campos: EstadoFerramenta['campos'] = {}
  if (nome.length < 2) campos.nome = 'Informe o nome da ferramenta.'
  if (!ehChaveIcone(icone)) campos.icone = 'Escolha o ícone.'
  if (!id) {
    const erroPrefixo = validarPrefixo(prefixo)
    if (erroPrefixo) campos.prefixo = erroPrefixo
  }
  if ('erro' in valor) campos.valor = valor.erro
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 200) {
    campos.quantidade = 'Quantidade de 0 a 200.'
  }
  if (!id && quantidade < 1) campos.quantidade = 'Ferramenta nova precisa de pelo menos 1 unidade.'
  if (Object.keys(campos).length > 0 || 'erro' in valor) return { campos, valores }

  const dados = { nome, icone, valor_reposicao: valor.centavos, alto_valor: altoValor }
  let tipoId = id
  if (id) {
    const { error } = await supabase
      .from('tipo_ferramenta')
      .update(dados)
      .eq('id', id)
      .eq('obra_id', obraId)
    if (error) {
      if (error.code === '23505')
        return { campos: { nome: 'Já existe ferramenta com esse nome.' }, valores }
      return { erro: 'Não foi possível salvar. Tente de novo.', valores }
    }
  } else {
    const { data, error } = await supabase
      .from('tipo_ferramenta')
      .insert({ ...dados, prefixo, obra_id: obraId })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') {
        return { erro: 'Já existe ferramenta com esse nome ou prefixo.', valores }
      }
      return { erro: 'Não foi possível salvar. Tente de novo.', valores }
    }
    tipoId = data.id
  }

  if (quantidade > 0) {
    const { error } = await supabase.rpc('adicionar_unidades', {
      p_tipo: tipoId,
      p_quantidade: quantidade,
    })
    if (error) {
      revalidatePath('/cadastros/ferramentas')
      return {
        erro: 'A ferramenta foi salva, mas as unidades não foram adicionadas. Tente adicionar de novo.',
        valores,
      }
    }
  }

  revalidatePath('/cadastros/ferramentas')
  redirect(id ? `/cadastros/ferramenta/${id}` : '/cadastros/ferramentas')
}
