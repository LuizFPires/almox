'use client'

import { CirculoFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import {
  deslocamentoMaximo,
  montarCartoes,
  montarColunas,
  paginar,
  subtituloPagina,
  type CartaoTv,
  type ColunaEmpresa,
  type FerramentaTv,
  type PainelTv as DadosPainel,
} from '@/lib/dominio/tv'
import { formatarHora } from '@/lib/formatos/datas'
import { useLoopTv } from './useLoopTv'
import { usePainel } from './usePainel'
import { useTvLigada } from './useTvLigada'

/** Grade por quantidade de cartões por página (configurável: 8, 12 ou 16). */
const GRADES: Record<number, string> = {
  8: 'grid-rows-2',
  12: 'grid-rows-3',
  16: 'grid-rows-4',
}

/** Painel da TV em loop: páginas de cartões por pessoa → colunas por empresa → recomeça. */
export function PainelTv({ inicial }: { inicial: DadosPainel }) {
  useTvLigada()
  const { painel, semConexaoDesde, naoAutorizado } = usePainel(inicial)
  const agora = new Date(painel.agora)
  const cartoes = montarCartoes(painel, agora)
  const porPagina = painel.config.cartoesPorPagina
  const paginas = paginar(cartoes, porPagina)
  const colunas = montarColunas(cartoes, painel)
  const maxOff = deslocamentoMaximo(colunas)
  const { fase, visivel, trilho, progresso } = useLoopTv({
    nPaginas: paginas.length,
    maxOff,
    config: painel.config,
  })

  if (naoAutorizado) {
    return (
      <Tela obra={painel.obra} titulo="" subtitulo="" pontos={null} semConexaoDesde={null}>
        <p className="text-4xl font-bold">Dispositivo não autorizado</p>
      </Tela>
    )
  }

  const indice = fase.tipo === 'pagina' ? Math.min(fase.indice, Math.max(0, paginas.length - 1)) : 0
  const titulo = fase.tipo === 'empresas' ? 'POR EMPRESA' : 'QUEM ESTÁ COM O QUÊ'
  const subtitulo =
    fase.tipo === 'pagina' && cartoes.length > 0
      ? subtituloPagina(indice, porPagina, cartoes.length)
      : ''
  const pontos =
    paginas.length > 0
      ? { total: paginas.length + 1, ativo: fase.tipo === 'empresas' ? paginas.length : indice }
      : null

  return (
    <Tela
      obra={painel.obra}
      titulo={titulo}
      subtitulo={subtitulo}
      pontos={pontos}
      semConexaoDesde={semConexaoDesde}
      progresso={progresso}
    >
      <div
        className="relative h-full w-full transition-opacity duration-[600ms] ease-in-out"
        style={{ opacity: visivel ? 1 : 0 }}
      >
        {cartoes.length === 0 ? (
          <p className="flex h-full items-center justify-center text-4xl text-tv-texto-2">
            Nenhuma ferramenta fora do almoxarifado
          </p>
        ) : fase.tipo === 'pagina' ? (
          <div
            className={`absolute inset-0 grid grid-cols-4 gap-4 ${GRADES[porPagina] ?? GRADES[12]}`}
          >
            {(paginas[indice] ?? []).map((c) => (
              <Cartao key={c.id} cartao={c} compacto={porPagina === 16} />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <div ref={trilho} className="flex h-full gap-6 will-change-transform">
              {colunas.map((c) => (
                <Coluna key={c.id} coluna={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Tela>
  )
}

function Tela({
  obra,
  titulo,
  subtitulo,
  pontos,
  semConexaoDesde,
  progresso,
  children,
}: {
  obra: string
  titulo: string
  subtitulo: string
  pontos: { total: number; ativo: number } | null
  semConexaoDesde: Date | null
  progresso?: React.Ref<HTMLDivElement>
  children: React.ReactNode
}) {
  return (
    <div
      data-testid="painel-tv"
      className="flex h-dvh flex-col gap-4 overflow-hidden bg-tv-fundo px-10 py-7 text-tv-texto"
    >
      <header className="flex h-16 shrink-0 items-center gap-7">
        <div className="flex items-baseline gap-4">
          <Marca altura={44} tom="reversa" />
          <span className="text-xl text-tv-texto-2">{obra}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-4">
          <h1 className="text-[34px] font-bold tracking-wide whitespace-nowrap">{titulo}</h1>
          <span className="truncate text-[22px] text-tv-texto-2">{subtitulo}</span>
        </div>
        {semConexaoDesde && (
          <span
            role="status"
            className="rounded-full bg-tv-alerta-fundo px-4 py-2 text-lg font-bold whitespace-nowrap text-tv-alerta"
          >
            Sem conexão desde {formatarHora(semConexaoDesde)}
          </span>
        )}
        {pontos && (
          <span className="flex items-center gap-2.5" aria-hidden="true">
            {Array.from({ length: pontos.total }, (_, i) => (
              <span
                key={i}
                className={`h-3 rounded-md transition-all ${i === pontos.ativo ? 'w-9 bg-amarelo' : 'w-3 bg-tv-linha'}`}
              />
            ))}
          </span>
        )}
        <Relogio
          formato="hora"
          className="min-w-[130px] text-right text-[52px] leading-none font-bold tracking-tight tabular-nums"
        />
      </header>
      <main className="relative min-h-0 flex-1">{children}</main>
      <div className="h-2 shrink-0 overflow-hidden rounded bg-tv-chip">
        <div ref={progresso} className="h-2 rounded bg-amarelo" style={{ width: '0%' }} />
      </div>
    </div>
  )
}

function Cartao({ cartao: c, compacto }: { cartao: CartaoTv; compacto: boolean }) {
  return (
    <article
      aria-label={c.nome}
      className={`flex min-h-0 min-w-0 flex-col gap-3 rounded-[18px] border-2 bg-tv-cartao px-5 py-[18px] ${
        c.pendencia ? 'border-tv-alerta' : 'border-tv-cartao'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[34px] leading-[1.05] font-bold">{c.nome}</span>
          <span className="text-[19px] text-tv-texto-2">{c.funcao}</span>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-tv-chip px-3 py-1.5">
          <span
            aria-hidden="true"
            className="size-[11px] rounded-full"
            style={{ background: c.empresa.cor }}
          />
          <span className="text-base font-semibold whitespace-nowrap">{c.empresa.nome}</span>
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 items-start gap-3.5">
        {c.ferramentas.map((f) => (
          <Ferramenta key={f.tipo} ferramenta={f} compacto={compacto} />
        ))}
        {c.mais > 0 && (
          <li className="flex w-[104px] flex-col items-center gap-1.5">
            <span
              className={`flex items-center justify-center rounded-full bg-tv-chip font-bold ${compacto ? 'size-14 text-xl' : 'size-[76px] text-[26px]'}`}
            >
              +{c.mais}
            </span>
            <span className="text-lg leading-tight font-semibold">mais</span>
          </li>
        )}
      </ul>
      {c.pendencia ? (
        <p className="rounded-[10px] bg-tv-alerta-fundo px-3 py-1.5 text-lg font-bold text-tv-alerta">
          Não devolvido · {c.pendencia}
        </p>
      ) : (
        <p className="text-lg text-tv-texto-2">{c.retirouAs}</p>
      )}
    </article>
  )
}

function Ferramenta({ ferramenta: f, compacto }: { ferramenta: FerramentaTv; compacto: boolean }) {
  return (
    <li className="flex w-[104px] flex-col items-center gap-1.5">
      <span className="relative">
        {ehChaveIcone(f.icone) ? (
          <CirculoFerramenta
            icone={f.icone}
            circulo={compacto ? 'size-14' : 'size-[76px]'}
            svg={compacto ? 32 : 44}
          />
        ) : (
          <span className={`block rounded-full bg-sutil ${compacto ? 'size-14' : 'size-[76px]'}`} />
        )}
        {f.quantidade > 1 && (
          <span className="absolute -right-2 -bottom-1 rounded-full bg-amarelo px-2 text-lg font-bold text-escuro">
            ×{f.quantidade}
          </span>
        )}
      </span>
      <span className="text-center text-lg leading-[1.1] font-semibold">{f.tipo}</span>
    </li>
  )
}

function Coluna({ coluna: c }: { coluna: ColunaEmpresa }) {
  return (
    <section
      aria-label={c.nome}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[18px] bg-tv-cartao"
      style={{ width: c.larguraPx }}
    >
      <div className="h-2.5 shrink-0" style={{ background: c.cor }} />
      <h2 className="border-b border-tv-linha px-[22px] pt-4 pb-3.5 text-[40px] leading-none font-bold">
        {c.nome}
      </h2>
      <ul
        className={`grid min-h-0 flex-1 content-start gap-x-7 px-[22px] pt-1.5 pb-3.5 ${c.dupla ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        {c.pessoas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2.5 border-b border-tv-linha py-3.5">
            <span className="flex items-baseline justify-between gap-2.5">
              <span
                className={`truncate text-[28px] leading-[1.05] font-bold ${p.pendencia ? 'text-tv-alerta' : ''}`}
              >
                {p.nome}
              </span>
              <span
                className={`text-[17px] whitespace-nowrap ${p.pendencia ? 'text-tv-alerta' : 'text-tv-texto-2'}`}
              >
                {p.pendencia ?? p.retirouAs?.replace('Retirou às ', '')}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {p.todas.map((f) => (
                <span
                  key={f.tipo}
                  className="flex items-center gap-2 rounded-full bg-tv-chip py-1 pr-3.5 pl-1"
                >
                  {ehChaveIcone(f.icone) && (
                    <CirculoFerramenta icone={f.icone} circulo="size-10" svg={24} />
                  )}
                  <span className="text-lg font-semibold">
                    {f.tipo}
                    {f.quantidade > 1 && ` ×${f.quantidade}`}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
