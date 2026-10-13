import Link from 'next/link'
import { CirculoFerramenta } from '@/components/IconeFerramenta'
import { ehIcone } from '@/components/icones-ferramenta'
import { textoDesde } from '@/lib/dominio/ficha'
import type { pendenciasPorPessoa } from '@/lib/dominio/lista'
import { formatarBRL } from '@/lib/formatos/moeda'

type Props = {
  pendencias: ReturnType<typeof pendenciasPorPessoa>
  /** Momento do servidor (ISO), para "desde ontem" bater com o resto do app. */
  agora: string
}

/** Aba "Não devolvidas": quem ficou com peça de um dia para o outro, por pessoa. */
export function ListaNaoDevolvidas({ pendencias, agora }: Props) {
  const momento = new Date(agora)
  const { lista, pecas, aDescontar } = pendencias
  if (lista.length === 0) {
    return (
      <p className="py-6 text-center text-[15px] text-texto-2">
        Nenhuma ferramenta pendente de outro dia.
      </p>
    )
  }
  return (
    <>
      <p className="flex items-baseline justify-between gap-3 rounded-cartao bg-erro-claro px-4 py-3 text-erro">
        <span className="text-[15px] font-bold">
          {pecas} {pecas === 1 ? 'peça' : 'peças'} com {lista.length}{' '}
          {lista.length === 1 ? 'pessoa' : 'pessoas'}
        </span>
        {aDescontar > 0 && (
          <span className="text-[13px] font-semibold">{formatarBRL(aDescontar)} a descontar</span>
        )}
      </p>
      {lista.map((p) => (
        <Link
          key={p.pessoa.id}
          href={`/pessoa/${p.pessoa.id}?volta=${encodeURIComponent('/lista?aba=nao-devolvidas')}`}
          className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="font-bold">{p.pessoa.nome}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-texto-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: p.pessoa.empresa.cor }}
                />
                {p.pessoa.funcao} · {p.pessoa.empresa.nome}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end text-right text-[13px] font-bold text-erro">
              {textoDesde(p.desde, momento)}
              <span className={p.descontavel ? 'font-semibold' : 'font-semibold text-texto-2'}>
                {p.descontavel ? formatarBRL(p.valor) : 'própria · sem desconto'}
              </span>
            </span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            {p.itens.map((i) => (
              <span
                key={i.codigo}
                className="flex min-h-8 items-center gap-1.5 rounded-full bg-sutil py-[3px] pr-2.5 pl-[3px]"
              >
                {ehIcone(i.icone) && (
                  <CirculoFerramenta icone={i.icone} circulo="size-[26px]" svg={16} destaque />
                )}
                <span className="text-[13px] font-semibold">{i.tipo}</span>
                <span className="font-mono text-[11px] text-texto-2">{i.codigo}</span>
              </span>
            ))}
          </span>
        </Link>
      ))}
    </>
  )
}
