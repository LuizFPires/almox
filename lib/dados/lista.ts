import 'server-only'
import type { TipoEstoque, PosseVisivel } from '@/lib/dominio/estoque'
import type { PessoaLista } from '@/lib/dominio/lista'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Nunca use select * em pessoa: qr_token é fechado ao cliente.

type PessoaComPosses = {
  id: string
  nome: string
  nome_capacete: string
  funcao: string
  ativa: boolean
  empresa: { id: string; nome: string; cor: string; tipo: 'propria' | 'empreiteira' } | null
  posses: {
    desde: string
    unidade: {
      codigo: string
      tipo: { nome: string; icone: string; valor_reposicao: number } | null
    } | null
  }[]
}

/**
 * Pessoas com o que está com cada uma (a RLS limita a consulta de empreiteira). Inativas
 * vêm junto: quem foi inativado com ferramenta continua aparecendo até devolver.
 */
export async function pessoasComItens(obraId: string): Promise<PessoaLista[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select(
      'id, nome, nome_capacete, funcao, ativa, empresa:empresa!pessoa_empresa_id_obra_id_fkey (id, nome, cor, tipo), ' +
        'posses:posse!posse_pessoa_id_obra_id_fkey (desde, ' +
        'unidade:unidade!posse_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome, icone, valor_reposicao)))',
    )
    .eq('obra_id', obraId)
    .overrideTypes<PessoaComPosses[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a lista.')
  return data
    .filter((p) => p.empresa)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      nomeCapacete: p.nome_capacete,
      funcao: p.funcao,
      ativa: p.ativa,
      empresa: p.empresa!,
      itens: p.posses.flatMap((x) =>
        x.unidade
          ? [
              {
                codigo: x.unidade.codigo,
                tipo: x.unidade.tipo?.nome ?? '',
                icone: x.unidade.tipo?.icone ?? '',
                desde: x.desde,
                valor: x.unidade.tipo?.valor_reposicao ?? 0,
              },
            ]
          : [],
      ),
    }))
}

/** Empresas da obra para os grupos da lista: própria primeiro, depois por nome. */
export async function empresasDaLista(
  obraId: string,
): Promise<{ id: string; nome: string; cor: string }[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('empresa')
    .select('id, nome, cor')
    .eq('obra_id', obraId)
    .order('tipo') // enum: propria antes de empreiteira
    .order('nome')
  if (error) throw new Error('Não foi possível carregar as empresas.')
  return data
}

type TipoComUnidades = {
  id: string
  nome: string
  icone: string
  unidades: { id: string; codigo: string; status: TipoEstoque['unidades'][number]['status'] }[]
}

type PosseComPessoa = { unidade_id: string; desde: string; pessoa: { nome: string } | null }

/** Tipos com todas as unidades (estoque é da obra) e as posses que o usuário pode ver. */
export async function dadosEstoque(
  obraId: string,
): Promise<{ tipos: TipoEstoque[]; posses: PosseVisivel[] }> {
  const supabase = await criarClienteServidor()
  const [tipos, posses] = await Promise.all([
    supabase
      .from('tipo_ferramenta')
      .select('id, nome, icone, unidades:unidade!unidade_tipo_id_obra_id_fkey (id, codigo, status)')
      .eq('obra_id', obraId)
      .order('nome')
      .overrideTypes<TipoComUnidades[], { merge: false }>(),
    supabase
      .from('posse')
      .select('unidade_id, desde, pessoa:pessoa!posse_pessoa_id_obra_id_fkey (nome)')
      .eq('obra_id', obraId)
      .overrideTypes<PosseComPessoa[], { merge: false }>(),
  ])
  if (tipos.error || posses.error) throw new Error('Não foi possível carregar o estoque.')
  return {
    tipos: tipos.data,
    posses: posses.data.map((p) => ({
      unidadeId: p.unidade_id,
      pessoa: p.pessoa?.nome ?? '',
      desde: p.desde,
    })),
  }
}
