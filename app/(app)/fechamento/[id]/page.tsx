import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { IconeInterface } from '@/components/IconeInterface'
import { SeloFimDoDia } from '@/components/SeloFimDoDia'
import { resumoFechamento } from '@/lib/dados/fechamento'
import { destinatariosAviso, subtituloEncerrado } from '@/lib/dominio/fechamento'
import { formatarBRL } from '@/lib/formatos/moeda'

export const metadata: Metadata = { title: 'Dia encerrado · Almox' }

/** Resultado do encerramento: avisos por empreiteira e pendências próprias (protótipo). */
export default async function PaginaDiaEncerrado({ params }: PageProps<'/fechamento/[id]'>) {
  const { id } = await params
  const r = await resumoFechamento(id)
  if (!r) notFound()
  const n = r.avisos.length

  return (
    <>
      <Cabecalho titulo="Fechamento do dia" voltarPara="/fechamento" selo={<SeloFimDoDia />} />
      <main className="flex flex-1 flex-col items-center gap-4 px-4 pt-6 pb-6">
        <span
          aria-hidden="true"
          className="flex size-24 items-center justify-center rounded-full bg-escuro text-amarelo"
        >
          <IconeInterface nome="check" tamanho={52} />
        </span>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Dia encerrado</h1>
          <p className="text-texto-2">{subtituloEncerrado(r.pessoasPendentes)}</p>
          {r.automatico && (
            <p className="text-[13px] text-texto-2">Encerrado automaticamente às 23:59.</p>
          )}
        </div>

        {(n > 0 || r.proprios.length > 0) && (
          <ul className="w-full rounded-cartao bg-cartao px-4 py-1">
            {r.avisos.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 border-b border-borda py-3 last:border-b-0"
              >
                <IconeInterface nome="box" tamanho={22} className="text-texto-2" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">{a.empresa}</span>
                  <span className="text-sm text-erro">
                    {destinatariosAviso(a.dono, a.encarregado)} · {formatarBRL(a.total)} a descontar
                  </span>
                </span>
              </li>
            ))}
            {r.proprios.map((p) => (
              <li
                key={p.nome}
                className="flex items-center gap-3 border-b border-borda py-3 last:border-b-0"
              >
                <IconeInterface nome="box" tamanho={22} className="text-texto-2" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">{p.nome}</span>
                  <span className="text-sm text-erro">
                    Construtora · {formatarBRL(p.valor)} · engenheiro avisado
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="flex w-full items-center gap-3 rounded-cartao bg-escuro px-4 py-3 text-[15px] text-white">
          <IconeInterface nome="dashboard" tamanho={22} className="text-amarelo" />
          Pendências de amanhã já marcadas no painel da TV
        </p>

        {n > 0 && (
          <Link
            href={`/fechamento/${r.id}/aviso`}
            className="flex min-h-13 w-full items-center justify-center rounded-botao bg-erro px-4 font-bold text-white"
          >
            Ver aviso enviado ({n} {n === 1 ? 'empreiteira' : 'empreiteiras'})
          </Link>
        )}
        <div className="grid w-full grid-cols-2 gap-3">
          <Link
            href="/fechamento"
            className="flex min-h-12 items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
          >
            Ver fechamento
          </Link>
          <Link
            href="/inicio"
            className="flex min-h-12 items-center justify-center rounded-botao bg-amarelo font-bold"
          >
            Início
          </Link>
        </div>
      </main>
    </>
  )
}
