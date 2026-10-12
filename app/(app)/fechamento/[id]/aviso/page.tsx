import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { PreviaAviso } from '@/components/PreviaAviso'
import { SeloFimDoDia } from '@/components/SeloFimDoDia'
import { resumoFechamento } from '@/lib/dados/fechamento'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Aviso enviado · Almox' }

/** "Ver aviso enviado": prévia da notificação e do e-mail de cada empreiteira (protótipo). */
export default async function PaginaAvisoEnviado({
  params,
  searchParams,
}: PageProps<'/fechamento/[id]/aviso'>) {
  const { id } = await params
  const { e } = (await searchParams) as { e?: string }
  const [{ obraAtual }, r] = await Promise.all([obterSessao(), resumoFechamento(id)])
  if (!r || r.avisos.length === 0) notFound()
  const indice = Math.min(Math.max(Number(e) || 0, 0), r.avisos.length - 1)
  const a = r.avisos[indice]!

  return (
    <>
      <Cabecalho
        titulo="Aviso enviado"
        subtitulo="App + e-mail · dono e encarregado"
        voltarPara={`/fechamento/${id}`}
        selo={<SeloFimDoDia />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <nav aria-label="Empreiteiras avisadas" className="flex flex-wrap gap-2">
          {r.avisos.map((x, i) => (
            <Link
              key={x.id}
              href={`/fechamento/${id}/aviso?e=${i}`}
              aria-current={i === indice ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                i === indice ? 'border-escuro bg-escuro text-white' : 'border-borda bg-cartao'
              }`}
            >
              {x.empresa}
            </Link>
          ))}
        </nav>
        <PreviaAviso
          avisoId={a.id}
          obra={obraAtual.nome}
          empresa={a.empresa}
          dono={a.dono}
          donoEmail={a.donoEmail}
          encarregado={a.encarregado}
          encarregadoEmail={a.encarregadoEmail}
          data={r.encerradoEm}
          itens={a.itens}
          total={a.total}
        />
      </main>
    </>
  )
}
