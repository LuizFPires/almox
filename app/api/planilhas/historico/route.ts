import { NextResponse, type NextRequest } from 'next/server'
import { buscarHistorico, LIMITE_HISTORICO } from '@/lib/dados/historico'
import { lerFiltros, periodoValido } from '@/lib/dominio/historico'
import { planilhaHistorico } from '@/lib/planilhas/montar'
import { obterSessao } from '@/lib/sessao'

/** Histórico em planilha (.xlsx), com os mesmos filtros da tela. Só o engenheiro. */
export async function GET(request: NextRequest) {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') {
    return NextResponse.json({ erro: 'Só o engenheiro baixa o histórico.' }, { status: 403 })
  }
  const filtros = lerFiltros(Object.fromEntries(request.nextUrl.searchParams), new Date())
  if (!periodoValido(filtros)) {
    return NextResponse.json({ erro: 'Escolha um período de até um ano.' }, { status: 400 })
  }
  const arquivo = await planilhaHistorico(await buscarHistorico(obraAtual.id, filtros), {
    limite: LIMITE_HISTORICO,
  })
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almox-historico-${filtros.de}-a-${filtros.ate}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
