import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { PreviaAviso } from '@/components/PreviaAviso'
import { SeloPerfil } from '@/components/SeloPerfil'
import { buscarAviso } from '@/lib/dados/avisos'
import { rotuloStatusAviso, rotuloStatusDesconto, totalEmAberto } from '@/lib/dominio/avisos'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Aviso · Almox' }

/** Um aviso: situação de cada peça (devolvida antes da medição sai do desconto) e o e-mail. */
export default async function PaginaAviso({ params }: PageProps<'/avisos/[id]'>) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const a = await buscarAviso(obraAtual.id, id)
  if (!a || !a.empresa) notFound()
  const descontos = a.descontos.flatMap((d) => (d.desconto ? [d.desconto] : []))
  const statusPorCodigo = new Map(descontos.map((d) => [d.codigo, d.status]))
  const status = rotuloStatusAviso(a.status)

  return (
    <>
      <Cabecalho
        titulo="Aviso"
        subtitulo={a.empresa.nome}
        voltarPara="/avisos"
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <section
          aria-label="Situação"
          className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3.5"
        >
          <p className="font-bold">{status.texto}</p>
          {a.status === 'enviado' && (
            <p className="text-sm text-texto-2">
              Em aberto:{' '}
              <b className="text-erro">{formatarBRL(totalEmAberto(a.itens, descontos))}</b> de{' '}
              {formatarBRL(a.total)}. Se a ferramenta voltar antes do fechamento da medição, o
              desconto dela é cancelado.
            </p>
          )}
          <ul className="flex flex-col">
            {a.itens.map((i) => {
              const s = statusPorCodigo.get(i.codigo) ?? 'aberto'
              return (
                <li
                  key={i.codigo}
                  className="flex items-center justify-between gap-3 border-b border-borda py-2 text-sm last:border-b-0"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">
                      {i.tipo}{' '}
                      <span className="font-mono text-[12px] text-texto-2">{i.codigo}</span>
                    </span>
                    <span className="text-texto-2">{i.pessoa}</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className={s === 'cancelado' ? 'text-texto-2 line-through' : 'font-bold'}>
                      {formatarBRL(i.valor)}
                    </span>
                    <span
                      className={`text-[12px] ${s === 'cancelado' ? 'text-sucesso' : 'text-texto-2'}`}
                    >
                      {rotuloStatusDesconto(s)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        <PreviaAviso
          avisoId={a.id}
          obra={obraAtual.nome}
          empresa={a.empresa.nome}
          dono={a.empresa.dono_nome}
          donoEmail={a.empresa.dono_email}
          encarregado={a.empresa.encarregado?.nome ?? null}
          encarregadoEmail={a.empresa.encarregado_email}
          data={a.enviado_em}
          itens={a.itens}
          total={a.total}
        />
      </main>
    </>
  )
}
