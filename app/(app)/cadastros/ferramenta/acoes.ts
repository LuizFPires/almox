'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ehIcone, ehIconeArquivo } from '@/components/icones-ferramenta'
import { exigirEngenheiro } from '@/lib/acesso'
import { lerValorReposicao, sugerirPrefixo } from '@/lib/dominio/cadastros'
import { normalizarTexto } from '@/lib/formatos/texto'
import { valoresDoForm, type Valores } from '@/lib/formulario'

export type EstadoFerramenta = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'icone' | 'valor' | 'quantidade' | 'locadora', string>>
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
  const valor = lerValorReposicao(texto(form, 'valor'))
  const quantidade = Number(texto(form, 'quantidade') || '0')
  const altoValor = form.get('alto_valor') === 'on'
  const alugada = texto(form, 'propriedade') === 'alugada'
  const locadoraId = texto(form, 'locadora_id')
  const locadoraNova = texto(form, 'locadora_nova')

  const campos: EstadoFerramenta['campos'] = {}
  if (nome.length < 2) campos.nome = 'Informe o nome da ferramenta.'
  else if (nome.length > 80) campos.nome = 'Use até 80 caracteres.'
  // Ícone próprio só da obra ativa (o banco confere de novo).
  if (!ehIcone(icone) || (ehIconeArquivo(icone) && !icone.startsWith(`arquivo:${obraId}/`))) {
    campos.icone = 'Escolha o ícone.'
  }
  if ('erro' in valor) campos.valor = valor.erro
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 200) {
    campos.quantidade = 'Quantidade de 0 a 200.'
  }
  if (!id && quantidade < 1) campos.quantidade = 'Ferramenta nova precisa de pelo menos 1 unidade.'
  if (alugada && !locadoraId && locadoraNova.length < 2) {
    campos.locadora = 'Escolha a locadora ou digite o nome de uma nova.'
  }
  if (locadoraNova.length > 80) campos.locadora = 'Nome da locadora com até 80 letras.'
  if (Object.keys(campos).length > 0 || 'erro' in valor) return { campos, valores }

  // Alugada: usa a locadora escolhida ou cadastra a nova (sem repetir nome com outra grafia).
  let locadora: string | null = null
  if (alugada) {
    if (locadoraId) {
      locadora = locadoraId
    } else {
      const { data: existentes } = await supabase
        .from('locadora')
        .select('id, nome')
        .eq('obra_id', obraId)
      const chave = normalizarTexto(locadoraNova)
      const igual = (existentes ?? []).find((l) => normalizarTexto(l.nome) === chave)
      if (igual) {
        locadora = igual.id
      } else {
        const { data: criada, error } = await supabase
          .from('locadora')
          .insert({ obra_id: obraId, nome: locadoraNova })
          .select('id')
          .single()
        if (error) return { campos: { locadora: 'Não foi possível salvar a locadora.' }, valores }
        locadora = criada.id
      }
    }
  }

  const dados = {
    nome,
    icone,
    valor_reposicao: valor.centavos,
    alto_valor: altoValor,
    propriedade: alugada ? ('alugada' as const) : ('propria' as const),
    locadora_id: locadora,
  }
  let tipoId = id
  if (id) {
    // Confere que o tipo é da obra ativa: com id de outra obra, o update não acharia nada.
    const { data: atualizado, error } = await supabase
      .from('tipo_ferramenta')
      .update(dados)
      .eq('id', id)
      .eq('obra_id', obraId)
      .select('id')
      .maybeSingle()
    if (!error && !atualizado) return { erro: 'Ferramenta não encontrada nesta obra.', valores }
    if (error) {
      if (error.code === '23505')
        return { campos: { nome: 'Já existe ferramenta com esse nome.' }, valores }
      return { erro: 'Não foi possível salvar. Tente de novo.', valores }
    }
  } else {
    // O código das peças sai do nome (sem campo de prefixo): 2–4 letras que a obra não usa.
    const { data: usados } = await supabase
      .from('tipo_ferramenta')
      .select('prefixo')
      .eq('obra_id', obraId)
    const prefixo = sugerirPrefixo(
      nome,
      (usados ?? []).map((t) => t.prefixo),
    )
    const { data, error } = await supabase
      .from('tipo_ferramenta')
      .insert({ ...dados, prefixo, obra_id: obraId })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') {
        return { campos: { nome: 'Já existe ferramenta com esse nome.' }, valores }
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
