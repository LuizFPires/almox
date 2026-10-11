'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'
import { gerarEtiquetaTeste } from '@/lib/dominio/etiqueta'
import { validarIp } from '@/lib/dominio/impressao'
import { valoresDoForm, type Valores } from '@/lib/formulario'

const texto = (form: FormData, chave: string) => String(form.get(chave) ?? '').trim()

export type EstadoImpressora = {
  valores?: Valores
  erro?: string
  aviso?: string
  campos?: Partial<Record<'nome' | 'ip' | 'porta', string>>
}

/** Cria ou atualiza a impressora ativa da obra (uma por obra). */
export async function salvarImpressora(
  _: EstadoImpressora,
  form: FormData,
): Promise<EstadoImpressora> {
  const { supabase, obraId } = await exigirEngenheiro()
  const valores = valoresDoForm(form)
  const id = texto(form, 'id')
  const dados = {
    nome: texto(form, 'nome'),
    ip: texto(form, 'ip'),
    porta: Number(texto(form, 'porta') || '9100'),
    linguagem: texto(form, 'linguagem') === 'TSPL' ? ('TSPL' as const) : ('ZPL' as const),
    rolo: texto(form, 'rolo') || '60 × 80 mm',
  }
  const campos: EstadoImpressora['campos'] = {}
  if (dados.nome.length < 2) campos.nome = 'Informe um nome (ex.: Etiquetadora do almoxarifado).'
  const erroIp = validarIp(dados.ip)
  if (erroIp) campos.ip = erroIp
  if (!Number.isInteger(dados.porta) || dados.porta < 1 || dados.porta > 65535) {
    campos.porta = 'Porta inválida (normalmente 9100).'
  }
  if (Object.keys(campos).length > 0) return { campos, valores }

  const { data, error } = id
    ? await supabase
        .from('impressora')
        .update(dados)
        .eq('id', id)
        .eq('obra_id', obraId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('impressora')
        .insert({ ...dados, obra_id: obraId })
        .select('id')
        .maybeSingle()
  if (error || !data) return { erro: 'Não foi possível salvar a impressora.', valores }

  revalidatePath('/cadastros/impressora')
  return { aviso: 'Impressora salva.' }
}

export type EstadoAcaoSimples = { erro?: string; aviso?: string }

export async function imprimirTeste(): Promise<EstadoAcaoSimples> {
  const { supabase, obraId, obraAtual } = await exigirEngenheiro()
  const { data: impressora } = await supabase
    .from('impressora')
    .select('linguagem')
    .eq('obra_id', obraId)
    .eq('ativa', true)
    .maybeSingle()
  if (!impressora) return { erro: 'Escolha a impressora antes de testar.' }
  const { error } = await supabase.rpc('enfileirar_impressao', {
    p_obra: obraId,
    p_tipo: 'teste',
    p_descricao: 'Etiqueta de teste',
    p_payload: gerarEtiquetaTeste(impressora.linguagem, obraAtual.nome),
    p_copias: 1,
  })
  if (error) return { erro: 'Não foi possível mandar o teste para a fila.' }
  revalidatePath('/cadastros/impressora')
  return { aviso: 'Teste na fila. Confira a etiqueta na impressora.' }
}

export type EstadoDispositivo = { erro?: string; token?: string; nome?: string }

/** Cadastra o mini PC e devolve o token uma única vez. */
export async function criarDispositivo(
  _: EstadoDispositivo,
  form: FormData,
): Promise<EstadoDispositivo> {
  const { supabase, obraId } = await exigirEngenheiro()
  const nome = texto(form, 'nome') || 'Mini PC do almoxarifado'
  const { data, error } = await supabase.rpc('criar_dispositivo', { p_obra: obraId, p_nome: nome })
  if (error || !data) return { erro: 'Não foi possível cadastrar o dispositivo.' }
  revalidatePath('/cadastros/impressora')
  return { token: data, nome }
}

export async function revogarDispositivo(form: FormData) {
  const { supabase } = await exigirEngenheiro()
  await supabase.rpc('revogar_dispositivo', { p_dispositivo: texto(form, 'id') })
  revalidatePath('/cadastros/impressora')
}
