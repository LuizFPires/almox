import type { Metadata } from 'next'
import Link from 'next/link'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoImpressora } from '@/components/CartaoImpressora'
import { situacaoImpressao } from '@/lib/dados/impressao'
import { pessoasSemAdesivo } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'
import { BotaoLote } from './BotaoLote'

export const metadata: Metadata = { title: 'Adesivos em lote · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POR_VEZ = 100

/**
 * Adesivos em lote (M11): quem ainda não tem adesivo, da obra inteira ou de uma empresa
 * (?empresa=). Até 100 por toque; depois de cada lote mostra quantos faltam.
 * Reimpressão de uma pessoa continua pela ficha dela.
 */
export default async function PaginaAdesivos({ searchParams }: PageProps<'/cadastros/adesivos'>) {
  const p = (await searchParams) as Record<string, string | undefined>
  const { obraAtual } = await obterSessao()
  const volta = p.volta?.startsWith('/cadastros/') ? p.volta : '/cadastros/pessoas'
  const empresa = p.empresa && UUID.test(p.empresa) ? p.empresa : null
  const [faltam, { impressora, agente }] = await Promise.all([
    pessoasSemAdesivo(obraAtual.id, empresa),
    situacaoImpressao(obraAtual.id),
  ])
  const enviados = p.enviados === undefined ? null : Number(p.enviados) || 0
  const falhas = Number(p.falhas) || 0
  const titulo = empresa ? (faltam[0]?.empresa?.nome ?? 'Empresa') : 'Quem ainda não tem adesivo'
  const proximo = faltam.slice(0, POR_VEZ)

  return (
    <>
      <Cabecalho titulo="Adesivos em lote" subtitulo={titulo} voltarPara={volta} />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        {enviados !== null && (
          <p
            role="status"
            className="rounded-cartao bg-sucesso-claro px-4 py-3.5 text-[15px] font-semibold text-sucesso"
          >
            {enviados} {enviados === 1 ? 'adesivo foi para' : 'adesivos foram para'} a fila da
            impressora. {faltam.length > 0 ? `Faltam ${faltam.length}.` : 'Todos já têm adesivo.'}
          </p>
        )}
        {falhas > 0 && (
          <p
            role="alert"
            className="rounded-cartao bg-erro-claro px-4 py-3.5 text-[15px] text-erro"
          >
            {falhas} não {falhas === 1 ? 'foi' : 'foram'} para a fila. Imprima pela ficha da pessoa.
          </p>
        )}
        <CartaoImpressora impressora={impressora} agente={agente} href="/cadastros/impressora" />
        {faltam.length === 0 ? (
          <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
            Todos já têm adesivo. Para reimprimir, use a ficha da pessoa.
          </p>
        ) : (
          <>
            <p className="text-[15px] text-texto-2">
              {faltam.length > POR_VEZ
                ? `${faltam.length} pessoas sem adesivo. Vão ${POR_VEZ} por vez: toque de novo para as seguintes.`
                : `${faltam.length} ${faltam.length === 1 ? 'pessoa' : 'pessoas'} sem adesivo.`}
            </p>
            <ul
              aria-label="Pessoas"
              className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao"
            >
              {proximo.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-semibold">{x.nome}</span>
                  <span className="text-[13px] text-texto-2">{x.nome_capacete}</span>
                </li>
              ))}
            </ul>
            <BotaoLote quantidade={proximo.length} empresa={empresa} volta={volta} />
          </>
        )}
        {enviados !== null && (
          <Link href="/cadastros/impressora" className="text-center font-bold underline">
            Ver a impressora
          </Link>
        )}
      </main>
    </>
  )
}
