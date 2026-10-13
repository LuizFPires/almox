import 'server-only'
import type { ItemAviso } from '@/lib/envios/mensagens'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { buscarTodas } from './paginar'

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
    desconto: {
      codigo: string
      valor: number
      status: 'aberto' | 'cancelado' | 'confirmado'
      primeiro_aviso_id: string | null
    } | null
  }[]
}

const CAMPOS =
  'id, total, status, enviado_em, itens, ' +
  'empresa:empresa!aviso_empresa_id_obra_id_fkey (id, nome, cor, dono_nome, dono_email, encarregado_email, ' +
  'encarregado:pessoa!empresa_encarregado_fk (nome)), ' +
  'descontos:aviso_desconto!aviso_desconto_aviso_id_obra_id_fkey (desconto:desconto!aviso_desconto_desconto_id_obra_id_fkey (codigo, valor, status, primeiro_aviso_id))'

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

/** Envios que não chegaram (5 falhas) ou sem notificação ativada, para o engenheiro. */
export async function enviosComProblema(obraId: string) {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.rpc('envios_com_problema', { p_obra: obraId })
  return (data as { erro: number; semDestino: number } | null) ?? null
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
    // O total da prévia soma todos os abertos (mais de 1000 em obra longa): em páginas.
    buscarTodas(
      (de, ate) =>
        supabase
          .from('desconto')
          .select(
            'id, codigo, tipo_nome, valor, status, criado_em, empresa_id, pessoa:pessoa!desconto_pessoa_id_obra_id_fkey (nome)',
          )
          .eq('obra_id', obraId)
          .eq('status', 'aberto')
          .order('criado_em')
          .order('id')
          .range(de, ate)
          .overrideTypes<DescontoLinha[], { merge: false }>(),
      'Não foi possível carregar a medição.',
    ),
    supabase
      .from('medicao')
      .select('id, empresa_id, fechada_em, total, proxima')
      .eq('obra_id', obraId)
      .order('fechada_em', { ascending: false })
      .limit(30),
  ])
  if (empresas.error || medicoes.error) {
    throw new Error('Não foi possível carregar a medição.')
  }
  return { empresas: empresas.data, descontos, medicoes: medicoes.data }
}
