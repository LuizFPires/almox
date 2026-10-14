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

/**
 * Números da tela inicial, contados no banco (sem trazer posse por posse). A RLS limita a
 * consulta de empreiteira à própria empresa nas posses e pessoas; o estoque (livre /
 * manutenção) é da obra toda (PRD §5).
 */
export async function resumoDoDia(obraId: string, agora: Date): Promise<{ resumo: Resumo }> {
  const supabase = await criarClienteServidor()
  const contar = { count: 'exact' as const, head: true }
  const [noCanteiro, pendencias, pessoas, livres, manutencao] = await Promise.all([
    supabase.from('posse').select('unidade_id', contar).eq('obra_id', obraId),
    supabase
      .from('posse')
      .select('unidade_id', contar)
      .eq('obra_id', obraId)
      .lt('desde', inicioDoDiaDaObra(agora).toISOString()),
    // Pessoas com pelo menos uma posse (junção interna conta cada pessoa uma vez).
    supabase
      .from('pessoa')
      .select('id, posses:posse!posse_pessoa_id_obra_id_fkey!inner (unidade_id)', contar)
      .eq('obra_id', obraId),
    supabase.from('unidade').select('id', contar).eq('obra_id', obraId).eq('status', 'livre'),
    supabase.from('unidade').select('id', contar).eq('obra_id', obraId).eq('status', 'manutencao'),
  ])
  if (noCanteiro.error || pendencias.error || pessoas.error || livres.error || manutencao.error) {
    throw new Error('Não foi possível carregar o resumo.')
  }
  return {
    resumo: {
      noCanteiro: noCanteiro.count ?? 0,
      noAlmox: livres.count ?? 0,
      manutencao: manutencao.count ?? 0,
      pendencias: pendencias.count ?? 0,
      pessoasComFerramenta: pessoas.count ?? 0,
    },
  }
}

type MovimentoLinha = {
  id: string
  tipo: 'retirada' | 'devolucao' | 'estorno'
  via: 'qr' | 'manual'
  criado_em: string
  pessoa: { nome: string } | null
  usuario: { nome: string } | null
  itens: {
    unidade: { codigo: string; tipo: { nome: string } | null } | null
  }[]
}

type OcorrenciaLinha = {
  criado_em: string
  pessoa: { nome: string } | null
  usuario: { nome: string } | null
}

/**
 * Registro do Início: as 10 últimas movimentações (retiradas, devoluções e "Não é ele"), com o
 * login que lançou. O nome do login aparece para quem divide a obra com ele (RLS de usuario).
 */
export async function ultimosLancamentos(obraId: string): Promise<Lancamento[]> {
  const supabase = await criarClienteServidor()
  const [movimentos, ocorrencias] = await Promise.all([
    supabase
      .from('movimento')
      .select(
        'id, tipo, via, criado_em, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (nome), ' +
          'usuario:usuario!movimento_usuario_id_fkey (nome), ' +
          'itens:movimento_item!movimento_item_movimento_id_obra_id_fkey (' +
          'unidade:unidade!movimento_item_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)))',
      )
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
      .limit(10)
      .overrideTypes<MovimentoLinha[], { merge: false }>(),
    supabase
      .from('ocorrencia')
      .select(
        'criado_em, pessoa:pessoa!ocorrencia_pessoa_id_obra_id_fkey (nome), ' +
          'usuario:usuario!ocorrencia_usuario_id_fkey (nome)',
      )
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
      .limit(10)
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
      // Sem nome: a pessoa passou para outra empresa (o lançamento é do tempo da sua).
      pessoa: m.pessoa?.nome ?? 'Pessoa transferida',
      usuario: m.usuario?.nome ?? null,
      itens: m.itens.map((i) => ({
        nome: i.unidade?.tipo?.nome ?? '',
        codigo: i.unidade?.codigo ?? '',
      })),
    })),
    ...ocorrencias.data.map((o): Lancamento => ({
      tipo: 'ocorrencia',
      quando: o.criado_em,
      pessoa: o.pessoa?.nome ?? 'Pessoa transferida',
      usuario: o.usuario?.nome ?? null,
    })),
  ])
}
