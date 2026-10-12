import type { Metadata } from 'next'
import Link from 'next/link'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoImpressora } from '@/components/CartaoImpressora'
import { situacaoImpressao } from '@/lib/dados/impressao'
import { listarPessoas } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'
import { BotaoLote } from './BotaoLote'

export const metadata: Metadata = { title: 'Adesivos em lote · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Adesivos em lote (M11): das pessoas recém-importadas (?pessoas=) ou de uma empresa
 * (?empresa=). Um trabalho por pessoa na fila do agente de impressão.
 */
export default async function PaginaAdesivos({ searchParams }: PageProps<'/cadastros/adesivos'>) {
  const p = (await searchParams) as Record<string, string | undefined>
  const { obraAtual } = await obterSessao()
  const volta = p.volta?.startsWith('/cadastros/') ? p.volta : '/cadastros/pessoas'

  if (p.enviados !== undefined) {
    const enviados = Number(p.enviados) || 0
    const falhas = Number(p.falhas) || 0
    return (
      <>
        <Cabecalho titulo="Adesivos em lote" voltarPara={volta} />
        <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
          <p
            role="status"
            className="rounded-cartao bg-sucesso-claro px-4 py-3.5 text-[15px] font-semibold text-sucesso"
          >
            {enviados} {enviados === 1 ? 'adesivo foi para' : 'adesivos foram para'} a fila da
            impressora. Acompanhe em Cadastros › Impressora.
          </p>
          {falhas > 0 && (
            <p
              role="alert"
              className="rounded-cartao bg-erro-claro px-4 py-3.5 text-[15px] text-erro"
            >
              {falhas} não {falhas === 1 ? 'foi' : 'foram'} para a fila (pessoa inativa ou de outra
              obra). Imprima pela ficha da pessoa.
            </p>
          )}
          <Link href="/cadastros/impressora" className="text-center font-bold underline">
            Ver a impressora
          </Link>
        </main>
      </>
    )
  }

  const todas = await listarPessoas(obraAtual.id)
  const ids = new Set((p.pessoas ?? '').split(',').filter((x) => UUID.test(x)))
  const empresa = p.empresa && UUID.test(p.empresa) ? p.empresa : null
  const pessoas = todas.filter(
    (x) => x.ativa && (empresa ? x.empresa?.id === empresa : ids.has(x.id)),
  )
  const { impressora, agente } = await situacaoImpressao(obraAtual.id)
  const titulo = empresa ? (pessoas[0]?.empresa?.nome ?? 'Empresa') : 'Pessoas importadas'

  return (
    <>
      <Cabecalho titulo="Adesivos em lote" subtitulo={titulo} voltarPara={volta} />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        <CartaoImpressora impressora={impressora} agente={agente} href="/cadastros/impressora" />
        {pessoas.length === 0 ? (
          <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
            Ninguém ativo para imprimir.
          </p>
        ) : (
          <>
            <ul
              aria-label="Pessoas"
              className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao"
            >
              {pessoas.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-semibold">{x.nome}</span>
                  <span className="text-[13px] text-texto-2">{x.nome_capacete}</span>
                </li>
              ))}
            </ul>
            <BotaoLote pessoas={pessoas.map((x) => x.id)} volta={volta} />
          </>
        )}
      </main>
    </>
  )
}
