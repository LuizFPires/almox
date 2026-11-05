'use server'

import { revalidatePath } from 'next/cache'
import { enviarDepois } from '@/lib/envios/depois'
import { mensagemErroMaterial, type ItemContagem } from '@/lib/dominio/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import type { UnidadeMaterial } from '@/lib/formatos/quantidade'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Falha = { ok: false; erro: string }
type Resultado<T extends object = object> = ({ ok: true } & T) | Falha

const SEM_PERMISSAO_LANCAR = 'Só o almoxarife e o engenheiro lançam materiais.'
const SEM_PERMISSAO_CADASTRAR = 'Só o engenheiro mexe no cadastro de materiais.'

const chaveValida = (chave: string): string | undefined => (UUID.test(chave) ? chave : undefined)

function falha(error: { code?: string; message?: string }): Falha {
  return { ok: false, erro: mensagemErroMaterial(error.code, error.message) }
}

function atualizar(cadastro: boolean) {
  revalidatePath('/materiais')
  if (cadastro) revalidatePath('/cadastros/materiais')
  enviarDepois()
}

export async function registrarEntrada(p: {
  materialId: string
  quantidade: number
  chave: string
}): Promise<Resultado<{ id: string }>> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_LANCAR }
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('registrar_entrada_material', {
    p_obra: obraAtual.id,
    p_material: p.materialId,
    p_quantidade: p.quantidade,
    p_chave: chaveValida(p.chave),
  })
  if (error || !data) return falha(error ?? {})
  atualizar(false)
  return { ok: true, id: data }
}

export async function registrarSaida(p: {
  materialId: string
  quantidade: number
  chave: string
}): Promise<Resultado<{ id: string; aviso: boolean }>> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_LANCAR }
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('registrar_saida_material', {
    p_obra: obraAtual.id,
    p_material: p.materialId,
    p_quantidade: p.quantidade,
    p_chave: chaveValida(p.chave),
  })
  const r = data as { id?: string; aviso?: boolean } | null
  if (error || !r?.id) return falha(error ?? {})
  atualizar(false)
  return { ok: true, id: r.id, aviso: r.aviso === true }
}

export async function desfazerSaida(movimentoId: string): Promise<Resultado> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_LANCAR }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('desfazer_saida_material', {
    p_obra: obraAtual.id,
    p_movimento: movimentoId,
  })
  if (error) return falha(error)
  atualizar(false)
  return { ok: true }
}

export async function registrarContagem(p: {
  modo: 'ajustar' | 'conferir'
  itens: ItemContagem[]
  chave: string
}): Promise<Resultado<{ id: string }>> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_LANCAR }
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('registrar_contagem_material', {
    p_obra: obraAtual.id,
    p_modo: p.modo,
    p_itens: p.itens.map((i) => ({
      material: i.materialId,
      saldo_visto: i.saldoVisto,
      contado: i.contado,
    })),
    p_chave: chaveValida(p.chave),
  })
  if (error || !data) return falha(error ?? {})
  atualizar(false)
  return { ok: true, id: data }
}

export async function editarMovimento(p: {
  movimentoId: string
  quantidade: number
  motivo?: string
}): Promise<Resultado> {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil))
    return { ok: false, erro: 'Só o engenheiro corrige lançamentos.' }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('editar_movimento_material', {
    p_obra: obraAtual.id,
    p_movimento: p.movimentoId,
    p_quantidade: p.quantidade,
    p_motivo: p.motivo,
  })
  if (error) return falha(error)
  atualizar(false)
  return { ok: true }
}

export async function salvarMaterial(p: {
  id?: string
  nome: string
  unidade: UnidadeMaterial
  pedidoId?: string
}): Promise<Resultado<{ id: string }>> {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_CADASTRAR }
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('salvar_material', {
    p_obra: obraAtual.id,
    // null = material novo; o gerador de tipos não marca argumento de função como opcional.
    p_id: (p.id ?? null) as string,
    p_nome: p.nome,
    p_unidade: p.unidade,
    p_pedido: p.pedidoId,
  })
  if (error || !data) return falha(error ?? {})
  atualizar(true)
  return { ok: true, id: data }
}

export async function salvarAviso(p: {
  materialId: string
  tipo: 'quantidade' | 'percentual' | null
  valor: number | null
}): Promise<Resultado> {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_CADASTRAR }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('salvar_aviso_material', {
    p_obra: obraAtual.id,
    p_material: p.materialId,
    // null remove o aviso.
    p_tipo: p.tipo as string,
    p_valor: p.valor as number,
  })
  if (error) return falha(error)
  atualizar(true)
  return { ok: true }
}

export async function inativarMaterial(id: string): Promise<Resultado> {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_CADASTRAR }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('inativar_material', {
    p_obra: obraAtual.id,
    p_material: id,
  })
  if (error) return falha(error)
  atualizar(true)
  return { ok: true }
}

export async function pedirCadastro(nome: string): Promise<Resultado<{ id: string }>> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_LANCAR }
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('pedir_cadastro_material', {
    p_obra: obraAtual.id,
    p_nome: nome,
  })
  if (error || !data) return falha(error ?? {})
  atualizar(true)
  return { ok: true, id: data }
}

export async function dispensarPedido(id: string): Promise<Resultado> {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil)) return { ok: false, erro: SEM_PERMISSAO_CADASTRAR }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('dispensar_pedido_material', {
    p_obra: obraAtual.id,
    p_pedido: id,
  })
  if (error) return falha(error)
  atualizar(true)
  return { ok: true }
}
