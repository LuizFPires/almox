'use server'

import { redirect } from 'next/navigation'
import { enfileirarAdesivo, MENSAGEM_FALHA } from '@/lib/dados/adesivo'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LOTE = 300

export type EstadoLote = { erro?: string }

/**
 * Adesivos em lote (M11): um trabalho por pessoa na fila do agente (1 cópia cada). Para no
 * primeiro problema de impressora; pessoa que falhar não impede as outras.
 */
export async function imprimirLote(_: EstadoLote, form: FormData): Promise<EstadoLote> {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') return { erro: 'Só o engenheiro imprime adesivos.' }
  const ids = [...new Set(String(form.get('pessoas') ?? '').split(','))].filter((x) => UUID.test(x))
  if (ids.length === 0) return { erro: 'Nenhuma pessoa para imprimir.' }
  if (ids.length > MAX_LOTE) return { erro: `No máximo ${MAX_LOTE} adesivos por vez.` }
  const supabase = await criarClienteServidor()
  let enviados = 0
  let falhas = 0
  for (const id of ids) {
    const r = await enfileirarAdesivo(supabase, obraAtual.id, id, 1)
    if (r.ok) enviados++
    else if (r.motivo === 'sem-impressora') return { erro: MENSAGEM_FALHA['sem-impressora'] }
    else falhas++
  }
  const volta = String(form.get('volta') ?? '')
  redirect(
    `/cadastros/adesivos?${new URLSearchParams({ enviados: String(enviados), falhas: String(falhas), ...(volta.startsWith('/cadastros/') ? { volta } : {}) })}`,
  )
}
