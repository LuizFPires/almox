import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { IconeInterface } from '@/components/IconeInterface'
import { buscarDevolucao } from '@/lib/dados/devolucao'
import { compararCodigos } from '@/lib/dominio/cadastros'
import { statusDevolvido } from '@/lib/dominio/devolucao'
import { formatarHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Devolução registrada · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Sucesso da devolução (protótipo › ok): o que voltou e o que foi para manutenção. */
export default async function PaginaDevolucaoFeita({
  searchParams,
}: PageProps<'/pessoa/[id]/devolucao/feita'>) {
  const { mov } = (await searchParams) as { mov?: string }
  const { obraAtual } = await obterSessao()
  const devolucao = mov && UUID.test(mov) ? await buscarDevolucao(obraAtual.id, mov) : null
  if (!devolucao) notFound()

  const porTipo = new Map<string, { icone: string; codigos: string[]; avariadas: number }>()
  for (const item of devolucao.itens) {
    const nome = item.unidade?.tipo?.nome ?? ''
    const g = porTipo.get(nome) ?? {
      icone: item.unidade?.tipo?.icone ?? '',
      codigos: [],
      avariadas: 0,
    }
    g.codigos.push(item.unidade?.codigo ?? '')
    if (item.avariada) g.avariadas++
    porTipo.set(nome, g)
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-10 pb-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden="true"
          className="flex size-24 items-center justify-center rounded-full bg-escuro text-amarelo"
        >
          <IconeInterface nome="check" tamanho={48} />
        </span>
        <h1 className="text-[26px] font-bold">Devolução registrada</h1>
        <p className="text-[15px] text-texto-2">
          {devolucao.pessoa?.nome} · {formatarHora(devolucao.criado_em)}
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao px-4 py-1">
        {[...porTipo.entries()].map(([tipo, g]) => (
          <li key={tipo} className="flex items-center gap-3 py-3">
            {ehChaveIcone(g.icone) && <IconeFerramenta icone={g.icone} nome={tipo} tamanho="p" />}
            <span className="flex min-w-0 flex-col">
              <span className="font-bold">
                ×{g.codigos.length}{' '}
                <span className="font-mono text-xs font-normal text-texto-2">
                  {[...g.codigos].sort(compararCodigos).join(', ')}
                </span>
              </span>
              <span className={`text-[13px] ${g.avariadas > 0 ? 'text-erro' : 'text-sucesso'}`}>
                {statusDevolvido(g.codigos.length, g.avariadas)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <Link
          href="/leitura"
          className="flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-3 text-center text-base leading-tight font-bold"
        >
          Ler outro capacete
        </Link>
        <Link
          href="/inicio"
          className="flex min-h-14 items-center justify-center rounded-cartao bg-amarelo px-3 text-base font-bold text-texto"
        >
          Início
        </Link>
      </div>
    </main>
  )
}
