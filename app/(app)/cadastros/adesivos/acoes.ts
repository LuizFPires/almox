'use server'

import { redirect } from 'next/navigation'
import { enfileirarLoteAdesivos, MENSAGEM_FALHA } from '@/lib/dados/adesivo'
import { pessoasSemAdesivo } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Por toque: cabe com folga no tempo de uma requisição. */
const POR_VEZ = 100

export type EstadoLote = { erro?: string }

/**
 * Adesivos em lote (M11): quem ainda não tem adesivo (da obra ou de uma empresa), até 100 por
 * vez, um trabalho por pessoa na fila do agente, numa chamada só. Quem já está na fila não entra
 * de novo (o banco confere): repetir o toque continua de onde parou e nunca imprime duas vezes.
 */
export async function imprimirLote(_: EstadoLote, form: FormData): Promise<EstadoLote> {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') return { erro: 'Só o engenheiro imprime adesivos.' }
  const empresa = String(form.get('empresa') ?? '')
  const empresaId = UUID.test(empresa) ? empresa : null
  const lote = (await pessoasSemAdesivo(obraAtual.id, empresaId)).slice(0, POR_VEZ)
  if (lote.length === 0) return { erro: 'Todos já têm adesivo.' }
  // Uma ida ao banco para o lote todo (antes eram ~3 por pessoa e podia estourar o tempo).
  const r = await enfileirarLoteAdesivos(
    obraAtual.id,
    lote.map((p) => p.id),
  )
  if (!r.ok) return { erro: MENSAGEM_FALHA[r.motivo] }
  const enviados = r.enviados
  const falhas = lote.length - enviados
  const volta = String(form.get('volta') ?? '')
  const q = new URLSearchParams({ enviados: String(enviados), falhas: String(falhas) })
  if (empresaId) q.set('empresa', empresaId)
  if (volta.startsWith('/cadastros/')) q.set('volta', volta)
  redirect(`/cadastros/adesivos?${q}`)
}
