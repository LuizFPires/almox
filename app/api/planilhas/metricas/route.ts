import { NextResponse, type NextRequest } from 'next/server'
import { buscarMetricas } from '@/lib/dados/metricas'
import { lerFiltros, periodoValido } from '@/lib/dominio/historico'
import { diaDaObra } from '@/lib/formatos/datas'
import { planilhaMetricas } from '@/lib/planilhas/montar'
import { obterSessao } from '@/lib/sessao'

/** Relatório do piloto em planilha (.xlsx): metas e métricas por semana. Só o engenheiro. */
export async function GET(request: NextRequest) {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') {
    return NextResponse.json({ erro: 'Só o engenheiro vê as métricas.' }, { status: 403 })
  }
  const agora = new Date()
  const filtros = lerFiltros(
    {
      de: diaDaObra(new Date(agora.getTime() - 55 * 86_400_000)),
      ...Object.fromEntries(request.nextUrl.searchParams),
    },
    agora,
  )
  if (!periodoValido(filtros)) {
    return NextResponse.json({ erro: 'Escolha um período de até um ano.' }, { status: 400 })
  }
  const semanas = await buscarMetricas(obraAtual.id, filtros.de, filtros.ate)
  const arquivo = await planilhaMetricas(semanas, filtros)
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almox-piloto-${filtros.de}-a-${filtros.ate}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
