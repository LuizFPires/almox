import 'server-only'
import type { DadosAdesivo } from '@/lib/dominio/etiqueta'
import { gerarAdesivo } from '@/lib/dominio/etiqueta'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>

/** Dados do adesivo (inclui o token do QR). Só o engenheiro da obra consegue ler. */
export async function dadosAdesivo(
  pessoaId: string,
  supabase?: Cliente,
): Promise<DadosAdesivo | null> {
  const cliente = supabase ?? (await criarClienteServidor())
  const { data, error } = await cliente.rpc('dados_adesivo', { p_pessoa: pessoaId }).maybeSingle()
  if (error || !data) return null
  return {
    token: data.token,
    nomeCapacete: data.nome_capacete,
    nomeCompleto: data.nome,
    funcao: data.funcao,
    empresa: data.empresa,
    obra: data.obra,
    matricula: data.matricula,
  }
}

/** Até 200 adesivos de uma vez, para a folha A4 (só o engenheiro da obra; sem quem é de outra obra). */
export async function dadosAdesivos(
  obraId: string,
  pessoas: string[],
): Promise<(DadosAdesivo & { pessoaId: string })[]> {
  if (pessoas.length === 0) return []
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('dados_adesivos', {
    p_obra: obraId,
    p_pessoas: pessoas,
  })
  if (error) throw new Error('Não foi possível gerar os adesivos.')
  return data.map((d) => ({
    pessoaId: d.pessoa_id,
    token: d.token,
    nomeCapacete: d.nome_capacete,
    nomeCompleto: d.nome,
    funcao: d.funcao,
    empresa: d.empresa,
    obra: d.obra,
    matricula: d.matricula,
  }))
}

export type MotivoFalha = 'sem-impressora' | 'sem-pessoa' | 'falhou'

export const MENSAGEM_FALHA: Record<MotivoFalha, string> = {
  'sem-impressora': 'Nenhuma impressora escolhida. Escolha em Cadastros › Impressora.',
  'sem-pessoa': 'Pessoa não encontrada nesta obra.',
  falhou: 'Não foi possível mandar o adesivo para a fila. Tente de novo.',
}

export type ResultadoAdesivo = { ok: true; id: string } | { ok: false; motivo: MotivoFalha }

/**
 * Gera o adesivo na linguagem da impressora da obra e põe na fila. O agente do mini PC
 * pega o trabalho e manda para a impressora.
 */
export async function enfileirarAdesivo(
  supabase: Cliente,
  obraId: string,
  pessoaId: string,
  copias: number,
): Promise<ResultadoAdesivo> {
  const { data: impressora } = await supabase
    .from('impressora')
    .select('linguagem')
    .eq('obra_id', obraId)
    .eq('ativa', true)
    .maybeSingle()
  if (!impressora) return { ok: false, motivo: 'sem-impressora' }
  const dados = await dadosAdesivo(pessoaId, supabase)
  if (!dados) return { ok: false, motivo: 'sem-pessoa' }

  const { data: id, error } = await supabase.rpc('enfileirar_impressao', {
    p_obra: obraId,
    p_tipo: 'adesivo',
    p_descricao: `Adesivo de ${dados.nomeCapacete} (${dados.matricula})`,
    p_payload: gerarAdesivo(impressora.linguagem, dados, copias),
    p_copias: copias,
    p_pessoa: pessoaId,
  })
  if (error || !id) {
    return { ok: false, motivo: error?.code === 'P0002' ? 'sem-impressora' : 'falhou' }
  }
  return { ok: true, id }
}
