import Link from 'next/link'
import { rotuloMotivo } from '@/lib/dominio/devolucao'
import { textoDesde } from '@/lib/dominio/ficha'
import type { avariasPorPessoa } from '@/lib/dominio/lista'
import { formatarBRL } from '@/lib/formatos/moeda'

type Props = {
  grupos: ReturnType<typeof avariasPorPessoa>
  /** Momento do servidor (ISO). */
  agora: string
}

/** Aba "Avarias": peças em manutenção, por quem devolveu, com motivo, detalhes e foto. */
export function ListaAvarias({ grupos, agora }: Props) {
  const momento = new Date(agora)
  if (grupos.length === 0) {
    return <p className="py-6 text-center text-[15px] text-texto-2">Nenhuma peça avariada.</p>
  }
  return (
    <>
      {grupos.map((g) => (
        <section
          key={g.pessoa}
          aria-label={g.pessoa}
          className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3"
        >
          <h2 className="flex items-center justify-between gap-2">
            <span className="font-bold">{g.pessoa}</span>
            <span className="rounded-full bg-aviso-claro px-2 py-0.5 text-xs font-bold text-aviso">
              {g.itens.length} {g.itens.length === 1 ? 'avaria' : 'avarias'}
            </span>
          </h2>
          {g.itens.map((a) => (
            <Link
              key={a.id}
              href={a.avariaId ? `/avaria/${a.avariaId}` : '/lista?aba=avarias'}
              className="flex items-start gap-3 rounded-botao bg-aviso-claro p-2"
            >
              {a.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage privado
                <img
                  src={a.foto}
                  alt={`Foto da avaria de ${a.codigo}`}
                  className="size-12 shrink-0 rounded-[8px] object-cover"
                  width={48}
                  height={48}
                  // Miniatura: só baixa quando aparece na tela.
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span aria-hidden="true" className="size-12 shrink-0 rounded-[8px] bg-borda" />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-bold text-aviso">
                  {a.tipo} <span className="font-mono text-[11px]">{a.codigo}</span>
                  {a.motivo && ` · ${rotuloMotivo(a.motivo)}`}
                </span>
                {a.detalhes && <span className="text-[13px]">“{a.detalhes}”</span>}
                {a.quando && (
                  <span className="text-xs text-texto-2">
                    devolvida {textoDesde(a.quando, momento).replace(/^desde /, '')}
                  </span>
                )}
              </span>
              <span className="ml-auto flex shrink-0 flex-col items-end gap-0.5 self-center">
                {a.valor != null && (
                  <span className="text-[13px] font-bold tabular-nums">{formatarBRL(a.valor)}</span>
                )}
                <span aria-hidden="true" className="text-lg leading-none text-texto-2">
                  ›
                </span>
              </span>
            </Link>
          ))}
        </section>
      ))}
    </>
  )
}
