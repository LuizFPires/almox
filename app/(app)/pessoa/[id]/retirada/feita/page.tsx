import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconeInterface } from '@/components/IconeInterface'
import { buscarRetirada } from '@/lib/dados/retirada'
import { compararCodigos } from '@/lib/dominio/cadastros'
import { primeiroNome } from '@/lib/dominio/leitura'
import { formatarHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Retirada registrada · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Sucesso da retirada (protótipo › ok): o que saiu, com quem e como. */
export default async function PaginaRetiradaFeita({
  searchParams,
}: PageProps<'/pessoa/[id]/retirada/feita'>) {
  const { mov } = (await searchParams) as { mov?: string }
  const { obraAtual } = await obterSessao()
  const retirada = mov && UUID.test(mov) ? await buscarRetirada(obraAtual.id, mov) : null
  if (!retirada) notFound()

  const porTipo = new Map<string, string[]>()
  for (const item of retirada.itens) {
    const nome = item.unidade?.tipo?.nome ?? ''
    porTipo.set(nome, [...(porTipo.get(nome) ?? []), item.unidade?.codigo ?? ''])
  }
  const nome = retirada.pessoa?.nome ?? ''
  const primeiro = primeiroNome(nome)
  const qr = retirada.via === 'qr'

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-10 pb-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden="true"
          className="flex size-24 items-center justify-center rounded-full bg-aviso-claro"
        >
          <IconeInterface nome="check" tamanho={48} />
        </span>
        <h1 className="text-[26px] font-bold">Retirada registrada</h1>
        <p className="text-[15px] text-texto-2">
          {nome} · {formatarHora(retirada.criado_em)}
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao px-4 py-1">
        {[...porTipo.entries()].map(([tipo, codigos]) => (
          <li key={tipo} className="flex flex-col py-3">
            <span className="font-bold">
              {tipo} ×{codigos.length}{' '}
              <span className="font-mono text-sm font-normal">
                {[...codigos].sort(compararCodigos).join(', ')}
              </span>
            </span>
            <span className={`text-[13px] font-semibold ${qr ? 'text-sucesso' : 'text-erro'}`}>
              com {primeiro} · {qr ? 'QR conferido' : 'manual, sem QR'}
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
