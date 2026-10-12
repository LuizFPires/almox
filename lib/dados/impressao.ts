import 'server-only'
import { situacaoAgente } from '@/lib/dominio/impressao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type Impressora = {
  id: string
  nome: string
  ip: string
  porta: number
  linguagem: 'ZPL' | 'TSPL'
  rolo: string | null
}

export type Dispositivo = {
  id: string
  nome: string
  ultimo_ping: string | null
  ultimo_ping_tv: string | null
  revogado_em: string | null
  criado_em: string
}

export type Trabalho = {
  id: string
  /** 'adesivo' ou 'teste' (check no banco). */
  tipo: string
  descricao: string
  copias: number
  status: 'pendente' | 'enviando' | 'enviado' | 'erro'
  erro: string | null
  criado_em: string
  pessoa_id: string | null
}

export async function impressoraAtiva(obraId: string): Promise<Impressora | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('impressora')
    .select('id, nome, ip, porta, linguagem, rolo')
    .eq('obra_id', obraId)
    .eq('ativa', true)
    .maybeSingle()
  if (error) throw new Error('Não foi possível carregar a impressora.')
  return data ? { ...data, ip: String(data.ip) } : null
}

export async function listarDispositivos(obraId: string): Promise<Dispositivo[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('dispositivo_tv')
    .select('id, nome, ultimo_ping, ultimo_ping_tv, revogado_em, criado_em')
    .eq('obra_id', obraId)
    .order('criado_em', { ascending: false })
  if (error) throw new Error('Não foi possível carregar os dispositivos.')
  return data
}

export async function ultimosTrabalhos(obraId: string, pessoaId?: string): Promise<Trabalho[]> {
  const supabase = await criarClienteServidor()
  let consulta = supabase
    .from('trabalho_impressao')
    .select('id, tipo, descricao, copias, status, erro, criado_em, pessoa_id')
    .eq('obra_id', obraId)
    .order('criado_em', { ascending: false })
    .limit(pessoaId ? 3 : 8)
  if (pessoaId) consulta = consulta.eq('pessoa_id', pessoaId)
  const { data, error } = await consulta
  if (error) throw new Error('Não foi possível carregar a fila de impressão.')
  return data
}

/** Impressora ativa e situação do agente (o dispositivo ativo com sinal mais recente). */
export async function situacaoImpressao(obraId: string) {
  const [impressora, dispositivos] = await Promise.all([
    impressoraAtiva(obraId),
    listarDispositivos(obraId),
  ])
  const pings = dispositivos.filter((d) => !d.revogado_em).map((d) => d.ultimo_ping)
  return { impressora, agente: situacaoAgente(pings, new Date()) }
}
