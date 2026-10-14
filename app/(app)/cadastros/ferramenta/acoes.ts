'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ehIcone, ehIconeArquivo } from '@/components/icones-ferramenta'
import { exigirEngenheiro } from '@/lib/acesso'
import { lerValorReposicao, sugerirPrefixo } from '@/lib/dominio/cadastros'
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
 * unidades (códigos sequenciais). Quantidade 0 só atualiza. Tudo numa RPC transacional.
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
  const chave = texto(form, 'chave')

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
  if (!/^[0-9a-f-]{36}$/.test(chave)) return { erro: 'Recarregue a tela e tente de novo.', valores }
  if (Object.keys(campos).length > 0 || 'erro' in valor) return { campos, valores }

  // Tudo numa transação no banco (locadora, ferramenta e unidades): falha no meio não deixa
  // cadastro pela metade, e a chave do formulário faz a repetição não criar unidades de novo.
  const { data: usados } = id
    ? { data: [] }
    : await supabase.from('tipo_ferramenta').select('prefixo').eq('obra_id', obraId)
  const { error } = await supabase.rpc('salvar_ferramenta', {
    p_obra: obraId,
    p_chave: chave,
    p_id: id || undefined,
    p_nome: nome,
    p_icone: icone,
    p_valor: valor.centavos,
    p_alto_valor: altoValor,
    p_propriedade: alugada ? 'alugada' : 'propria',
    p_locadora_id: alugada && locadoraId ? locadoraId : undefined,
    p_locadora_nova: alugada && !locadoraId ? locadoraNova : undefined,
    p_quantidade: quantidade,
    // Sugestão a partir do nome; o banco confere e troca se já estiver em uso.
    p_prefixo: sugerirPrefixo(
      nome,
      (usados ?? []).map((t) => t.prefixo),
    ),
  })
  if (error) {
    if (error.code === '23505' && error.message.includes('tipo_ferramenta_obra_id_nome_key'))
      return { campos: { nome: 'Já existe ferramenta com esse nome.' }, valores }
    if (error.code === 'P0002') return { erro: error.message, valores }
    if (error.code === 'AL012') return { campos: { nome: error.message }, valores }
    // Tela reaproveitada pelo "voltar" do navegador com outros dados: pede para abrir de novo.
    if (error.code === 'AL013') return { erro: error.message, valores }
    return { erro: 'Não foi possível salvar. Nada foi gravado: tente de novo.', valores }
  }

  revalidatePath('/cadastros/ferramentas')
  redirect(id ? `/cadastros/ferramenta/${id}` : '/cadastros/ferramentas')
}
