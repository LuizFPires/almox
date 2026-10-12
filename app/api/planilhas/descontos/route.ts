import { NextResponse } from 'next/server'
import { planilhaDescontos, type LinhaDesconto } from '@/lib/planilhas/montar'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { diaDaObra } from '@/lib/formatos/datas'

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
  const { data, error } = await supabase
    .from('desconto')
    .select(
      'criado_em, cancelado_em, tipo_nome, codigo, valor, status, ' +
        'empresa:empresa!desconto_empresa_id_obra_id_fkey (nome), ' +
        'pessoa:pessoa!desconto_pessoa_id_obra_id_fkey (nome)',
    )
    .eq('obra_id', obraAtual.id)
    .order('criado_em', { ascending: false })
    .limit(5000)
    .overrideTypes<LinhaDesconto[], { merge: false }>()
  if (error) {
    return NextResponse.json({ erro: 'Não foi possível carregar os descontos.' }, { status: 500 })
  }
  const arquivo = await planilhaDescontos(data)
  return new NextResponse(new Uint8Array(arquivo), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="almox-descontos-${diaDaObra(new Date())}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
