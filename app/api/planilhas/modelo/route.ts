import { NextResponse } from 'next/server'
import { CHAVES_ICONE, ICONES_FERRAMENTA } from '@/components/icones-ferramenta'
import { planilhaModelo } from '@/lib/planilhas/importacao'
import { obterSessao } from '@/lib/sessao'

/** Planilha modelo do cadastro inicial (só o engenheiro, que é quem importa). */
export async function GET() {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') {
    return NextResponse.json({ erro: 'Só o engenheiro importa o cadastro.' }, { status: 403 })
  }
  const arquivo = await planilhaModelo(CHAVES_ICONE.map((c) => ICONES_FERRAMENTA[c].nome))
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="almox-cadastro-inicial.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
