import 'server-only'
import type { Aviso, SaldoMaterial } from '@/lib/dominio/materiais'
import type { UnidadeMaterial } from '@/lib/formatos/quantidade'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type LinhaMaterial = {
  id: string
  nome: string
  unidade: UnidadeMaterial
  saldo: number | string
  estoque_cheio: number | string
  aviso_tipo: 'quantidade' | 'percentual' | null
  aviso_valor: number | string | null
}

const COLUNAS_MATERIAL = 'id, nome, unidade, saldo, estoque_cheio, aviso_tipo, aviso_valor'

function paraSaldo(m: LinhaMaterial): SaldoMaterial {
  const aviso: Aviso =
    m.aviso_tipo && m.aviso_valor !== null ? { tipo: m.aviso_tipo, valor: Number(m.aviso_valor) } : null
  return {
    id: m.id,
    nome: m.nome,
    unidade: m.unidade,
    saldo: Number(m.saldo),
    estoqueCheio: Number(m.estoque_cheio),
    aviso,
  }
}

/** Materiais ativos da obra com saldo e aviso (a ordem da tela é decidida em `ordenarSaldos`). */
export async function listarSaldos(obraId: string): Promise<SaldoMaterial[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('material')
    .select(COLUNAS_MATERIAL)
    .eq('obra_id', obraId)
    .eq('ativo', true)
    .order('nome')
    .overrideTypes<LinhaMaterial[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar os materiais.')
  return data.map(paraSaldo)
}

/** Ids dos materiais por número de saídas nos últimos 30 dias (mais usado primeiro). */
export async function maisUsados(obraId: string): Promise<string[]> {
  const supabase = await criarClienteServidor()
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('extrato_material')
    .select('material_id')
    .eq('obra_id', obraId)
    .eq('tipo', 'saida')
    .eq('apagado', false)
    .gte('criado_em', desde)
    .overrideTypes<{ material_id: string }[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar os materiais mais usados.')
  const contagem = new Map<string, number>()
  for (const l of data) contagem.set(l.material_id, (contagem.get(l.material_id) ?? 0) + 1)
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export type LinhaExtrato = {
  id: string
  obraId: string
  materialId: string
  tipo: 'entrada' | 'saida' | 'ajuste' | 'conferencia'
  quantidadeOriginal: number
  quantidade: number
  apagado: boolean
  desfeito: boolean
  editadoPorNome: string | null
  editadoEm: string | null
  usuarioNome: string | null
  criadoEm: string
  registradoNoAparelhoEm: string | null
  materialNome: string
  unidade: UnidadeMaterial
}

type LinhaExtratoBanco = {
  id: string
  obra_id: string
  material_id: string
  tipo: LinhaExtrato['tipo']
  quantidade_original: number | string
  quantidade: number | string
  apagado: boolean
  desfeito: boolean
  editado_por_nome: string | null
  editado_em: string | null
  usuario_nome: string | null
  criado_em: string
  registrado_no_aparelho_em: string | null
}

const COLUNAS_EXTRATO =
  'id, obra_id, material_id, tipo, quantidade_original, quantidade, apagado, desfeito, ' +
  'editado_por_nome, editado_em, usuario_nome, criado_em, registrado_no_aparelho_em'

function paraLinha(l: LinhaExtratoBanco, nomes: Map<string, { nome: string; unidade: UnidadeMaterial }>): LinhaExtrato {
  const m = nomes.get(l.material_id)
  return {
    id: l.id,
    obraId: l.obra_id,
    materialId: l.material_id,
    tipo: l.tipo,
    quantidadeOriginal: Number(l.quantidade_original),
    quantidade: Number(l.quantidade),
    apagado: l.apagado,
    desfeito: l.desfeito,
    editadoPorNome: l.editado_por_nome,
    editadoEm: l.editado_em,
    usuarioNome: l.usuario_nome,
    criadoEm: l.criado_em,
    registradoNoAparelhoEm: l.registrado_no_aparelho_em,
    materialNome: m?.nome ?? '—',
    unidade: m?.unidade ?? 'un',
  }
}

/** Extrato (mais recente primeiro) da obra, ou de um material. Inclui materiais inativos. */
export async function extrato(obraId: string, materialId?: string, limite = 100): Promise<LinhaExtrato[]> {
  const supabase = await criarClienteServidor()
  let consulta = supabase.from('extrato_material').select(COLUNAS_EXTRATO).eq('obra_id', obraId)
  if (materialId) consulta = consulta.eq('material_id', materialId)
  const { data, error } = await consulta
    .order('criado_em', { ascending: false })
    .order('id', { ascending: false })
    .limit(limite)
    .overrideTypes<LinhaExtratoBanco[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar o extrato.')

  // A view não tem FK para embutir: busca nome e unidade dos materiais citados.
  const ids = [...new Set(data.map((l) => l.material_id))]
  const nomes = new Map<string, { nome: string; unidade: UnidadeMaterial }>()
  if (ids.length > 0) {
    const res = await supabase
      .from('material')
      .select('id, nome, unidade')
      .eq('obra_id', obraId)
      .in('id', ids)
      .overrideTypes<{ id: string; nome: string; unidade: UnidadeMaterial }[], { merge: false }>()
    if (res.error) throw new Error('Não foi possível carregar o extrato.')
    for (const m of res.data) nomes.set(m.id, { nome: m.nome, unidade: m.unidade })
  }
  return data.map((l) => paraLinha(l, nomes))
}

/** Ficha do material: saldo, última divergência de conferência e extrato. */
export async function fichaMaterial(
  obraId: string,
  id: string,
): Promise<{ material: SaldoMaterial; ultimaDivergencia: LinhaExtrato | null; extrato: LinhaExtrato[] } | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('material')
    .select(COLUNAS_MATERIAL)
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<LinhaMaterial, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar o material.')
  if (!data) return null
  const linhas = await extrato(obraId, id)
  // O extrato já vem do mais recente para o mais antigo.
  const ultimaDivergencia = linhas.find((l) => l.tipo === 'conferencia' && l.quantidade !== 0) ?? null
  return { material: paraSaldo(data), ultimaDivergencia, extrato: linhas }
}

type PedidoBanco = { id: string; nome: string; criado_em: string; autor: { nome: string } | null }

/** Pedidos de cadastro ainda abertos (mais antigos primeiro). */
export async function pedidosAbertos(
  obraId: string,
): Promise<{ id: string; nome: string; pedidoPor: string; criadoEm: string }[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pedido_cadastro_material')
    .select('id, nome, criado_em, autor:usuario!pedido_cadastro_material_pedido_por_fkey (nome)')
    .eq('obra_id', obraId)
    .eq('status', 'aberto')
    .order('criado_em')
    .overrideTypes<PedidoBanco[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar os pedidos de cadastro.')
  return data.map((p) => ({ id: p.id, nome: p.nome, pedidoPor: p.autor?.nome ?? '—', criadoEm: p.criado_em }))
}

/** Janela para desfazer a própria saída (igual a `desfazer_saida_material`). */
export const JANELA_DESFAZER_MS = 60_000

export type LancamentoFeito = {
  id: string
  tipo: 'entrada' | 'saida'
  /** Quantidade lançada, sempre positiva. */
  quantidade: number
  desfeito: boolean
  /** Quanto falta para acabar o prazo de desfazer, pelo relógio do servidor (0 = acabou). */
  restanteDesfazerMs: number
  material: SaldoMaterial
}

/** Entrada ou saída recém-lançada (tela de pronto), com o saldo atual do material. */
export async function lancamentoFeito(obraId: string, id: string): Promise<LancamentoFeito | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('extrato_material')
    .select('id, tipo, quantidade_original, desfeito, criado_em, material_id')
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<
      Pick<LinhaExtratoBanco, 'id' | 'tipo' | 'quantidade_original' | 'desfeito' | 'criado_em' | 'material_id'>,
      { merge: false }
    >()
  if (error) throw new Error('Não foi possível carregar o lançamento.')
  if (!data || (data.tipo !== 'entrada' && data.tipo !== 'saida')) return null
  const res = await supabase
    .from('material')
    .select(COLUNAS_MATERIAL)
    .eq('obra_id', obraId)
    .eq('id', data.material_id)
    .maybeSingle()
    .overrideTypes<LinhaMaterial, { merge: false }>()
  if (res.error) throw new Error('Não foi possível carregar o lançamento.')
  if (!res.data) return null
  const passou = Date.now() - new Date(data.criado_em).getTime()
  return {
    id: data.id,
    tipo: data.tipo,
    quantidade: Math.abs(Number(data.quantidade_original)),
    desfeito: data.desfeito,
    restanteDesfazerMs: Math.max(0, Math.min(JANELA_DESFAZER_MS, JANELA_DESFAZER_MS - passou)),
    material: paraSaldo(res.data),
  }
}
