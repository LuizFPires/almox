import { NextResponse } from 'next/server'
import { planilhaDescontos, type LinhaDesconto } from '@/lib/planilhas/montar'
import { obterSessao } from '@/lib/sessao'
import { buscarTodas } from '@/lib/dados/paginar'
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
  // A API corta em 1000 linhas por pedido: as duas buscas vão em páginas.
  let lista: LinhaDesconto[]
  let abertos: { valor: number }[]
  try {
    ;[lista, abertos] = await Promise.all([
      buscarTodas(
        (de, ate) =>
          supabase
            .from('desconto')
            .select(
              'criado_em, cancelado_em, tipo_nome, codigo, valor, status, ' +
                'empresa:empresa!desconto_empresa_id_obra_id_fkey (nome), ' +
                'pessoa:pessoa!desconto_pessoa_id_obra_id_fkey (nome)',
            )
            .eq('obra_id', obraAtual.id)
            .order('criado_em', { ascending: false })
            .order('id')
            .range(de, ate)
            .overrideTypes<LinhaDesconto[], { merge: false }>(),
        'Não foi possível carregar os descontos.',
      ).then((linhas) => linhas.slice(0, LIMITE)),
      // O total a descontar vem de todos os abertos, não só das linhas listadas.
      buscarTodas(
        (de, ate) =>
          supabase
            .from('desconto')
            .select('valor')
            .eq('obra_id', obraAtual.id)
            .eq('status', 'aberto')
            .order('id')
            .range(de, ate),
        'Não foi possível carregar os descontos.',
      ),
    ])
  } catch {
    return NextResponse.json({ erro: 'Não foi possível carregar os descontos.' }, { status: 500 })
  }
  const aDescontar = abertos.reduce((s, d) => s + d.valor, 0)
  const arquivo = await planilhaDescontos(lista, { aDescontar, limite: LIMITE })
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almox-descontos-${diaDaObra(new Date())}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
