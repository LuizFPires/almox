import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { iniciais } from '@/components/CartaoPessoaLancamento'
import { ConferenciaVencida } from '@/components/ConferenciaVencida'
import { buscarFicha, identificacaoValida } from '@/lib/dados/ficha'
import { agruparParaDevolver, type ItemComEla } from '@/lib/dominio/devolucao'
import { textoIdentificacao } from '@/lib/dominio/ficha'
import { primeiroNome } from '@/lib/dominio/leitura'
import { podeLancar, rotuloPerfil } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoDevolucao } from './FluxoDevolucao'

export const metadata: Metadata = { title: 'Devolução · Almox' }

/** Devolução (F-06). `ident` = conferência do capacete; sem ela, só o que saiu sem QR. */
export default async function PaginaDevolucao({
  params,
  searchParams,
}: PageProps<'/pessoa/[id]/devolucao'>) {
  const { id } = await params
  const { ident, via } = (await searchParams) as { ident?: string; via?: string }
  const { obraAtual, usuario } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect(`/pessoa/${id}`)
  const [pessoa, conferidaAte] = await Promise.all([
    buscarFicha(obraAtual.id, id),
    identificacaoValida(obraAtual.id, ident, id),
  ])
  if (!pessoa) notFound()
  const primeiro = primeiroNome(pessoa.nome)
  const conferida = Boolean(conferidaAte)
  if (ident && !conferida) {
    return <ConferenciaVencida titulo="Devolução" pessoaId={id} primeiro={primeiro} />
  }

  const itens: ItemComEla[] = pessoa.posses.map((p) => ({
    tipoId: p.unidade?.tipo?.id ?? '',
    tipo: p.unidade?.tipo?.nome ?? '',
    icone: p.unidade?.tipo?.icone ?? '',
    codigo: p.unidade?.codigo ?? '',
    desde: p.desde,
    via: p.via,
  }))
  const grupos = agruparParaDevolver(itens, conferida)
  const volta = conferida
    ? `/pessoa/${id}?ident=${ident}`
    : `/pessoa/${id}${via === 'manual' ? '?via=manual' : ''}`
  if (grupos.length === 0) redirect(volta)

  return (
    <FluxoDevolucao
      obraId={obraAtual.id}
      autor={`${usuario.nome} (${rotuloPerfil(obraAtual.perfil).toLowerCase()})`}
      pessoa={{ id: pessoa.id, nome: pessoa.nome, primeiro, iniciais: iniciais(pessoa.nome) }}
      identificacao={textoIdentificacao(
        conferida ? 'qr' : via === 'manual' ? 'manual' : 'lista',
        true,
        conferida,
      )}
      conferencia={conferida && ident ? ident : null}
      grupos={grupos}
      todos={agruparParaDevolver(itens, true)}
      voltarParaFicha={volta}
    />
  )
}
