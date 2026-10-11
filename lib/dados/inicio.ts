import 'server-only'
import { maisRecentes, type Lancamento } from '@/lib/dominio/lancamentos'
import { inicioDoDiaDaObra } from '@/lib/formatos/datas'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type Resumo = {
  noCanteiro: number
  noAlmox: number
  manutencao: number
  pendencias: number
  /** Pessoas que ainda estão com ferramenta (cartão do fechamento do dia). */
  pessoasComFerramenta: number
}

export type Pendencia = {
  unidadeId: string
  desde: string
  codigo: string
  ferramenta: string
  pessoa: { id: string; nome: string }
}

type PosseResumo = {
  unidade_id: string
  pessoa_id: string
  desde: string
  unidade: { codigo: string; tipo: { nome: string } | null } | null
  pessoa: { id: string; nome: string } | null
}

/**
 * Números e pendências da tela inicial. A RLS limita a consulta de empreiteira à própria
 * empresa nas posses; o estoque (livre / manutenção) é da obra toda (PRD §5).
 */
export async function resumoDoDia(
  obraId: string,
  agora: Date,
): Promise<{ resumo: Resumo; pendencias: Pendencia[] }> {
  const supabase = await criarClienteServidor()
  const [posses, livres, manutencao] = await Promise.all([
    supabase
      .from('posse')
      .select(
        'unidade_id, pessoa_id, desde, ' +
          'unidade:unidade!posse_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)), ' +
          'pessoa:pessoa!posse_pessoa_id_obra_id_fkey (id, nome)',
      )
      .eq('obra_id', obraId)
      .order('desde')
      .overrideTypes<PosseResumo[], { merge: false }>(),
    supabase
      .from('unidade')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obraId)
      .eq('status', 'livre'),
    supabase
      .from('unidade')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obraId)
      .eq('status', 'manutencao'),
  ])
  if (posses.error || livres.error || manutencao.error) {
    throw new Error('Não foi possível carregar o resumo.')
  }
  const inicioHoje = inicioDoDiaDaObra(agora).getTime()
  const pendentes = posses.data.filter((p) => new Date(p.desde).getTime() < inicioHoje)
  return {
    resumo: {
      noCanteiro: posses.data.length,
      noAlmox: livres.count ?? 0,
      manutencao: manutencao.count ?? 0,
      pendencias: pendentes.length,
      pessoasComFerramenta: new Set(posses.data.map((p) => p.pessoa_id)).size,
    },
    pendencias: pendentes.slice(0, 10).map((p) => ({
      unidadeId: p.unidade_id,
      desde: p.desde,
      codigo: p.unidade?.codigo ?? '',
      ferramenta: p.unidade?.tipo?.nome ?? '',
      pessoa: { id: p.pessoa?.id ?? p.pessoa_id, nome: p.pessoa?.nome ?? '' },
    })),
  }
}

type MovimentoLinha = {
  id: string
  tipo: 'retirada' | 'devolucao' | 'estorno'
  via: 'qr' | 'manual'
  criado_em: string
  pessoa: { nome: string } | null
  itens: {
    unidade: { codigo: string; tipo: { nome: string } | null } | null
  }[]
}

type OcorrenciaLinha = { criado_em: string; pessoa: { nome: string } | null }

/** Últimos 5 lançamentos: retiradas, devoluções e bloqueios ("Não é ele"). */
export async function ultimosLancamentos(obraId: string): Promise<Lancamento[]> {
  const supabase = await criarClienteServidor()
  const [movimentos, ocorrencias] = await Promise.all([
    supabase
      .from('movimento')
      .select(
        'id, tipo, via, criado_em, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (nome), ' +
          'itens:movimento_item!movimento_item_movimento_id_obra_id_fkey (' +
          'unidade:unidade!movimento_item_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)))',
      )
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
      .limit(5)
      .overrideTypes<MovimentoLinha[], { merge: false }>(),
    supabase
      .from('ocorrencia')
      .select('criado_em, pessoa:pessoa!ocorrencia_pessoa_id_obra_id_fkey (nome)')
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
      .limit(5)
      .overrideTypes<OcorrenciaLinha[], { merge: false }>(),
  ])
  if (movimentos.error || ocorrencias.error) {
    throw new Error('Não foi possível carregar os lançamentos.')
  }
  return maisRecentes([
    ...movimentos.data.map((m): Lancamento => ({
      id: m.id,
      tipo: m.tipo,
      via: m.via,
      quando: m.criado_em,
      pessoa: m.pessoa?.nome ?? '',
      itens: m.itens.map((i) => ({
        nome: i.unidade?.tipo?.nome ?? '',
        codigo: i.unidade?.codigo ?? '',
      })),
    })),
    ...ocorrencias.data.map((o): Lancamento => ({
      tipo: 'ocorrencia',
      quando: o.criado_em,
      pessoa: o.pessoa?.nome ?? '',
    })),
  ])
}
