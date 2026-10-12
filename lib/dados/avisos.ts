import 'server-only'
import type { ItemAviso } from '@/lib/envios/mensagens'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type AvisoLinha = {
  id: string
  total: number
  status: 'enviado' | 'cancelado' | 'confirmado'
  enviado_em: string
  itens: ItemAviso[]
  empresa: {
    id: string
    nome: string
    cor: string
    dono_nome: string | null
    dono_email: string | null
    encarregado_email: string | null
    encarregado: { nome: string } | null
  } | null
  descontos: {
    desconto: { codigo: string; status: 'aberto' | 'cancelado' | 'confirmado' } | null
  }[]
}

const CAMPOS =
  'id, total, status, enviado_em, itens, ' +
  'empresa:empresa!aviso_empresa_id_obra_id_fkey (id, nome, cor, dono_nome, dono_email, encarregado_email, ' +
  'encarregado:pessoa!empresa_encarregado_fk (nome)), ' +
  'descontos:aviso_desconto!aviso_desconto_aviso_id_obra_id_fkey (desconto:desconto!aviso_desconto_desconto_id_obra_id_fkey (codigo, status))'

/** Avisos que o login pode ver (RLS: engenheiro e a própria empreiteira), do mais novo. */
export async function listarAvisos(obraId: string, limite = 60) {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('aviso')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .order('enviado_em', { ascending: false })
    .limit(limite)
    .overrideTypes<AvisoLinha[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar os avisos.')
  return data
}

export async function buscarAviso(obraId: string, id: string) {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('aviso')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<AvisoLinha, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar o aviso.')
  return data
}

type DescontoLinha = {
  id: string
  codigo: string
  tipo_nome: string
  valor: number
  status: 'aberto' | 'cancelado' | 'confirmado'
  criado_em: string
  empresa_id: string
  pessoa: { nome: string } | null
}

/** Para a medição: empreiteiras, descontos em aberto e o histórico de medições. */
export async function dadosMedicao(obraId: string) {
  const supabase = await criarClienteServidor()
  const [empresas, descontos, medicoes] = await Promise.all([
    supabase
      .from('empresa')
      .select('id, nome, cor, proxima_medicao')
      .eq('obra_id', obraId)
      .eq('tipo', 'empreiteira')
      .order('nome'),
    supabase
      .from('desconto')
      .select(
        'id, codigo, tipo_nome, valor, status, criado_em, empresa_id, pessoa:pessoa!desconto_pessoa_id_obra_id_fkey (nome)',
      )
      .eq('obra_id', obraId)
      .eq('status', 'aberto')
      .order('criado_em')
      .overrideTypes<DescontoLinha[], { merge: false }>(),
    supabase
      .from('medicao')
      .select('id, empresa_id, fechada_em, total, proxima')
      .eq('obra_id', obraId)
      .order('fechada_em', { ascending: false })
      .limit(30),
  ])
  if (empresas.error || descontos.error || medicoes.error) {
    throw new Error('Não foi possível carregar a medição.')
  }
  return { empresas: empresas.data, descontos: descontos.data, medicoes: medicoes.data }
}
