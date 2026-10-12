import 'server-only'
import type { DevolucaoHoje, PosseFechamento } from '@/lib/dominio/fechamento'
import type { ItemAviso } from '@/lib/envios/mensagens'
import { diaDaObra, inicioDoDiaDaObra } from '@/lib/formatos/datas'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type PosseLinha = {
  desde: string
  pessoa: {
    id: string
    nome: string
    empresa: { nome: string; cor: string; tipo: 'propria' | 'empreiteira' } | null
  } | null
  unidade: { tipo: { nome: string; valor_reposicao: number } | null } | null
}

type DevolucaoLinha = {
  criado_em: string
  pessoa: { id: string; nome: string; empresa: { nome: string } | null } | null
}

/** Tudo da tela de fechamento: peças fora agora, devoluções de hoje e o fechamento do dia. */
export async function dadosFechamento(obraId: string, agora: Date) {
  const supabase = await criarClienteServidor()
  const [posses, devolucoes, fechamento] = await Promise.all([
    supabase
      .from('posse')
      .select(
        'desde, pessoa:pessoa!posse_pessoa_id_obra_id_fkey (id, nome, ' +
          'empresa:empresa!pessoa_empresa_id_obra_id_fkey (nome, cor, tipo)), ' +
          'unidade:unidade!posse_unidade_id_obra_id_fkey (tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome, valor_reposicao))',
      )
      .eq('obra_id', obraId)
      .overrideTypes<PosseLinha[], { merge: false }>(),
    supabase
      .from('movimento')
      .select(
        'criado_em, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (id, nome, ' +
          'empresa:empresa!pessoa_empresa_id_obra_id_fkey (nome))',
      )
      .eq('obra_id', obraId)
      .eq('tipo', 'devolucao')
      .gte('criado_em', inicioDoDiaDaObra(agora).toISOString())
      .order('criado_em', { ascending: false })
      .overrideTypes<DevolucaoLinha[], { merge: false }>(),
    supabase
      .from('fechamento_dia')
      .select('id, encerrado_em, automatico')
      .eq('obra_id', obraId)
      .eq('data', diaDaObra(agora))
      .maybeSingle(),
  ])
  if (posses.error || devolucoes.error || fechamento.error) {
    throw new Error('Não foi possível carregar o fechamento.')
  }

  const pecas: PosseFechamento[] = posses.data.flatMap((p) =>
    p.pessoa?.empresa && p.unidade?.tipo
      ? [
          {
            pessoaId: p.pessoa.id,
            pessoa: p.pessoa.nome,
            empresa: {
              nome: p.pessoa.empresa.nome,
              cor: p.pessoa.empresa.cor,
              propria: p.pessoa.empresa.tipo === 'propria',
            },
            tipo: p.unidade.tipo.nome,
            valor: p.unidade.tipo.valor_reposicao,
            desde: p.desde,
          },
        ]
      : [],
  )
  // A mais recente de cada pessoa (a lista vem da mais nova para a mais velha).
  const vistas = new Set<string>()
  const ultimas: DevolucaoHoje[] = []
  for (const d of devolucoes.data) {
    if (!d.pessoa || vistas.has(d.pessoa.id)) continue
    vistas.add(d.pessoa.id)
    ultimas.push({
      pessoaId: d.pessoa.id,
      pessoa: d.pessoa.nome,
      empresa: d.pessoa.empresa?.nome ?? '',
      quando: d.criado_em,
    })
  }
  return { pecas, devolucoes: ultimas, fechamentoHoje: fechamento.data }
}

export type AvisoResumo = {
  id: string
  empresa: string
  dono: string | null
  donoEmail: string | null
  encarregado: string | null
  encarregadoEmail: string | null
  total: number
  status: 'enviado' | 'cancelado' | 'confirmado'
  itens: ItemAviso[]
}

export type ResumoFechamento = {
  id: string
  data: string
  encerradoEm: string
  automatico: boolean
  avisos: AvisoResumo[]
  proprios: { nome: string; valor: number }[]
  pessoasPendentes: number
}

/** Resultado de um encerramento, para quem lança (função do banco confere o perfil). */
export async function resumoFechamento(fechamentoId: string): Promise<ResumoFechamento | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('resumo_fechamento', { p_fechamento: fechamentoId })
  if (error) throw new Error('Não foi possível carregar o encerramento.')
  return (data as unknown as ResumoFechamento | null) ?? null
}
