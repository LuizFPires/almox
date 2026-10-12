import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { limparFotosOrfas, processarEnvios } from '@/lib/envios/processar'

/**
 * Processador da fila de envios, chamado pelo agendamento do Supabase (pg_cron + pg_net) com
 * o segredo ENVIOS_SEGREDO. `{"tarefa":"limpeza"}` apaga as fotos de avaria órfãs.
 */
export async function POST(request: NextRequest) {
  const segredo = process.env.ENVIOS_SEGREDO
  const recebido = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!segredo || !iguais(recebido, segredo)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }
  const corpo = (await request.json().catch(() => ({}))) as { tarefa?: string }
  if (corpo.tarefa === 'limpeza') {
    return NextResponse.json({ fotosApagadas: await limparFotosOrfas() })
  }
  return NextResponse.json(await processarEnvios())
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
