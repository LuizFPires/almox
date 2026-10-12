import { NextResponse } from 'next/server'
import { planilhaDescontos, type LinhaDesconto } from '@/lib/planilhas/montar'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { diaDaObra } from '@/lib/formatos/datas'

const LIMITE = 5000

/**
 * Avisos e descontos em planilha (.xlsx): uma linha por peça cobrada. A RLS decide o que vem:
 * o engenheiro vê todas as empreiteiras; a consulta da empreiteira, só a própria.
 */
export async function GET() {
  const { obraAtual } = await obterSessao()
  if (
    obraAtual.perfil === 'almoxarife' ||
    (obraAtual.perfil === 'consulta' && !obraAtual.empresa)
  ) {
    return NextResponse.json({ erro: 'Sem acesso aos avisos.' }, { status: 403 })
  }
  const supabase = await criarClienteServidor()
  const [lista, abertos] = await Promise.all([
    supabase
      .from('desconto')
      .select(
        'criado_em, cancelado_em, tipo_nome, codigo, valor, status, ' +
          'empresa:empresa!desconto_empresa_id_obra_id_fkey (nome), ' +
          'pessoa:pessoa!desconto_pessoa_id_obra_id_fkey (nome)',
      )
      .eq('obra_id', obraAtual.id)
      .order('criado_em', { ascending: false })
      .limit(LIMITE)
      .overrideTypes<LinhaDesconto[], { merge: false }>(),
    // O total a descontar vem de todos os abertos, não só das linhas listadas.
    supabase.from('desconto').select('valor').eq('obra_id', obraAtual.id).eq('status', 'aberto'),
  ])
  if (lista.error || abertos.error) {
    return NextResponse.json({ erro: 'Não foi possível carregar os descontos.' }, { status: 500 })
  }
  const aDescontar = abertos.data.reduce((s, d) => s + d.valor, 0)
  const arquivo = await planilhaDescontos(lista.data, { aDescontar, limite: LIMITE })
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almox-descontos-${diaDaObra(new Date())}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
