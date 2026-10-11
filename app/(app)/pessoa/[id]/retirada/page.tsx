import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { buscarFicha, identificacaoValida } from '@/lib/dados/ficha'
import { tiposParaRetirar } from '@/lib/dados/retirada'
import { ehPendencia, textoDesde, textoIdentificacao } from '@/lib/dominio/ficha'
import { primeiroNome } from '@/lib/dominio/leitura'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoRetirada } from './FluxoRetirada'

export const metadata: Metadata = { title: 'Retirada · Almox' }

function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

/** Retirada (F-05). `ident` = conferência do capacete (QR); sem ela, manual (RN-05). */
export default async function PaginaRetirada({
  params,
  searchParams,
}: PageProps<'/pessoa/[id]/retirada'>) {
  const { id } = await params
  const { ident, via } = (await searchParams) as { ident?: string; via?: string }
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect(`/pessoa/${id}`)
  const [pessoa, conferidaAte, tipos] = await Promise.all([
    buscarFicha(obraAtual.id, id),
    identificacaoValida(obraAtual.id, ident, id),
    tiposParaRetirar(obraAtual.id),
  ])
  if (!pessoa || !pessoa.ativa) notFound()

  const conferida = Boolean(conferidaAte)
  // Veio do capacete, mas a conferência venceu: não vira manual sem o almoxarife escolher.
  if (ident && !conferida) {
    return (
      <>
        <Cabecalho titulo="Retirada" subtitulo="Conferência vencida" voltarPara={`/pessoa/${id}`} />
        <main className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-6">
          <p role="alert" className="rounded-cartao bg-aviso-claro px-4 py-3.5 text-[17px]">
            A conferência do capacete vale 10 minutos e já venceu. Leia o capacete do{' '}
            {primeiroNome(pessoa.nome)} de novo.
          </p>
          <Link
            href="/leitura"
            className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro px-5 text-lg font-bold text-white"
          >
            Ler o capacete
          </Link>
          <Link
            href={`/pessoa/${id}?via=manual`}
            className="flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-5 text-lg font-bold"
          >
            Escolher na lista (manual)
          </Link>
        </main>
      </>
    )
  }
  const agora = new Date()
  const pendencias = pessoa.posses
    .filter((p) => ehPendencia(p.desde, agora))
    .map(
      (p) =>
        `${p.unidade?.tipo?.nome ?? ''} ${p.unidade?.codigo ?? ''} ${textoDesde(p.desde, agora)}`,
    )
  const volta = conferida
    ? `/pessoa/${id}?ident=${ident}`
    : `/pessoa/${id}${via === 'manual' ? '?via=manual' : ''}`

  return (
    <FluxoRetirada
      pessoa={{
        id: pessoa.id,
        nome: pessoa.nome,
        primeiro: primeiroNome(pessoa.nome),
        iniciais: iniciais(pessoa.nome),
      }}
      identificacao={textoIdentificacao(
        conferida ? 'qr' : via === 'manual' ? 'manual' : 'lista',
        true,
        conferida,
      )}
      conferencia={conferida && ident ? ident : null}
      tipos={tipos}
      pendencias={pendencias}
      voltarParaFicha={volta}
    />
  )
}
