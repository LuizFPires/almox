import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { iniciais } from '@/components/CartaoPessoaLancamento'
import { ConferenciaVencida } from '@/components/ConferenciaVencida'
import { buscarFicha, identificacaoValida } from '@/lib/dados/ficha'
import { tiposParaRetirar } from '@/lib/dados/retirada'
import { ehPendencia, textoDesde, textoIdentificacao } from '@/lib/dominio/ficha'
import { primeiroNome } from '@/lib/dominio/leitura'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoRetirada } from './FluxoRetirada'

export const metadata: Metadata = { title: 'Retirada · Almox' }

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
      <ConferenciaVencida titulo="Retirada" pessoaId={id} primeiro={primeiroNome(pessoa.nome)} />
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
