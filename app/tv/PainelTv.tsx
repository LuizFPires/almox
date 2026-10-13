'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CirculoFerramenta } from '@/components/IconeFerramenta'
import { ehIcone } from '@/components/icones-ferramenta'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { Pareamento } from './Pareamento'
import {
  deslocamentoMaximo,
  empacotar,
  larguraColuna,
  montarCartoes,
  montarColunas,
  paginar,
  PESSOAS_POR_SUBCOLUNA,
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

/** A tela é montada sempre em 1920 × 1080 (protótipo) e escalada para a TV. */
const LARGURA_TELA = 1920
const ALTURA_TELA = 1080

/** Grade por quantidade de cartões por página (configurável: 8, 12 ou 16). */
const GRADES: Record<number, string> = {
  8: 'grid-rows-2',
  12: 'grid-rows-3',
  16: 'grid-rows-4',
}

/** Painel da TV em loop: páginas de cartões por pessoa → colunas por empresa → recomeça. */
export function PainelTv({ inicial }: { inicial: DadosPainel }) {
  useTvLigada()
  const { painel, semConexaoDesde, naoAutorizado, diferencaMs } = usePainel(inicial)
  const agora = useAgora(painel.agora, diferencaMs)
  // Recalcula só quando chegam dados novos ou vira o minuto (as trocas de fase da animação
  // renderizam de novo sem mudar nada disso).
  const minuto = agora.getTime()
  const cartoes = useMemo(() => montarCartoes(painel, new Date(minuto)), [painel, minuto])
  const porPagina = painel.config.cartoesPorPagina
  const paginas = useMemo(() => paginar(cartoes, porPagina), [cartoes, porPagina])
  const colunas = useMemo(() => montarColunas(cartoes, painel), [cartoes, painel])
  const { fase, visivel, trilho, progresso } = useLoopTv({
    nPaginas: paginas.length,
    temColunas: colunas.length > 0,
    // Estimativa; o motor mede o trilho de verdade quando as colunas estão na tela.
    maxOff: deslocamentoMaximo(colunas),
    config: painel.config,
  })

  if (naoAutorizado) {
    return (
      <Tela obra={painel.obra} titulo="" diferencaMs={diferencaMs}>
        {/* Desconectada (ou conectada em outro lugar): já mostra o código para conectar de novo. */}
        <Pareamento aviso="Esta TV foi desconectada." />
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
      diferencaMs={diferencaMs}
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
            <div ref={trilho} className="flex h-full w-max gap-6 will-change-transform">
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

/**
 * "Agora" que anda sozinho (a cada minuto), na hora do servidor: depois da meia-noite a
 * pendência fica vermelha mesmo sem nenhum lançamento novo.
 */
function useAgora(agoraServidor: string, diferencaMs: number): Date {
  const [minuto, setMinuto] = useState<number | null>(null)
  useEffect(() => {
    const atualizar = () => setMinuto(Date.now())
    atualizar()
    const intervalo = setInterval(atualizar, 60_000)
    return () => clearInterval(intervalo)
  }, [])
  // Antes de montar (e no servidor), a hora que veio com os dados: sem diferença de hidratação.
  return minuto === null ? new Date(agoraServidor) : new Date(minuto + diferencaMs)
}

/**
 * Monta a tela em 1920 × 1080 e escala para caber na TV (outra resolução ou zoom do sistema),
 * centralizada, como um slide. As medidas internas (e a rolagem das colunas) não mudam.
 */
function Escala({ children }: { children: React.ReactNode }) {
  const [escala, setEscala] = useState(1)
  useLayoutEffect(() => {
    const ajustar = () =>
      setEscala(Math.min(window.innerWidth / LARGURA_TELA, window.innerHeight / ALTURA_TELA))
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-tv-fundo">
      <div
        className="shrink-0"
        style={{ width: LARGURA_TELA * escala, height: ALTURA_TELA * escala }}
      >
        <div
          style={{
            width: LARGURA_TELA,
            height: ALTURA_TELA,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Moldura da TV: cabeçalho fino, conteúdo e barra de progresso. Também para "carregando". */
export function Tela({
  obra,
  titulo,
  subtitulo = '',
  pontos = null,
  semConexaoDesde = null,
  diferencaMs = 0,
  progresso,
  children,
}: {
  obra: string
  titulo: string
  subtitulo?: string
  pontos?: { total: number; ativo: number } | null
  semConexaoDesde?: Date | null
  diferencaMs?: number
  progresso?: React.Ref<HTMLDivElement>
  children: React.ReactNode
}) {
  return (
    <Escala>
      <div
        data-testid="painel-tv"
        className="flex h-full w-full flex-col gap-4 overflow-hidden bg-tv-fundo px-10 py-7 text-tv-texto"
      >
        <header className="flex h-16 shrink-0 items-center gap-7">
          <div className="flex items-baseline gap-4">
            <Marca altura={44} tom="reversa" />
            <span className="text-xl text-tv-texto-2">{obra}</span>
          </div>
          <div className="flex min-w-0 flex-1 items-baseline justify-center gap-4">
            <h1 className="text-[34px] font-bold tracking-[1.5px] whitespace-nowrap">{titulo}</h1>
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
            diferencaMs={diferencaMs}
            className="min-w-[130px] text-right text-[52px] leading-none font-bold tracking-tight tabular-nums"
          />
        </header>
        <main className="relative min-h-0 flex-1">{children}</main>
        <div className="h-2 shrink-0 overflow-hidden rounded bg-tv-chip">
          <div ref={progresso} className="h-2 rounded bg-amarelo" style={{ width: '0%' }} />
        </div>
      </div>
    </Escala>
  )
}

function Cartao({ cartao: c, compacto }: { cartao: CartaoTv; compacto: boolean }) {
  return (
    <article
      aria-label={c.nome}
      className={`flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-[18px] border-2 bg-tv-cartao px-5 py-[18px] ${
        c.pendencia ? 'border-tv-alerta-borda' : 'border-tv-cartao'
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
        <p className="shrink-0 rounded-[10px] bg-tv-alerta-fundo px-3 py-1.5 text-lg font-bold text-tv-alerta">
          Não devolvido · {c.pendencia}
        </p>
      ) : (
        <p className="shrink-0 text-lg text-tv-texto-2">{c.retirouAs}</p>
      )}
    </article>
  )
}

function Ferramenta({ ferramenta: f, compacto }: { ferramenta: FerramentaTv; compacto: boolean }) {
  return (
    <li className="flex w-[104px] flex-col items-center gap-1.5">
      <span className="relative">
        {ehIcone(f.icone) ? (
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
      {/* Nome longo quebra com hífen e no máximo em 2 linhas, sem invadir o vizinho. */}
      <span className="line-clamp-2 w-full text-center text-lg leading-[1.1] font-semibold break-words hyphens-auto">
        {f.tipo}
      </span>
    </li>
  )
}

/**
 * Coluna da empresa. Começa com 6 pessoas por subcoluna, mede a altura de cada linha e abre
 * outra subcoluna quando alguém não caberia (muitas ferramentas quebram a linha das pílulas).
 */
function Coluna({ coluna: c }: { coluna: ColunaEmpresa }) {
  const corpo = useRef<HTMLDivElement>(null)
  const linhas = useRef(new Map<string, HTMLLIElement>())
  const [grupos, setGrupos] = useState<string[][]>(() => porSeis(c.pessoas.map((p) => p.id)))
  const ids = c.pessoas.map((p) => p.id)
  const chave = ids.join(',')
  // O que muda a altura das linhas: quem está, as ferramentas de cada um e a pendência.
  const conteudo = c.pessoas
    .map(
      (p) =>
        `${p.id}:${p.todas.map((f) => `${f.tipo}×${f.quantidade}`).join('|')}:${p.pendencia ?? ''}`,
    )
    .join(',')

  // Sem as pessoas de agora (alguém devolveu tudo), volta à estimativa até medir de novo.
  const atuais = grupos.flat().join(',') === chave ? grupos : porSeis(ids)

  useLayoutEffect(() => {
    const el = corpo.current
    if (!el) return
    const ids = chave ? chave.split(',') : []
    const estilo = getComputedStyle(el)
    const disponivel =
      el.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom)
    const alturas = ids.map((id) => linhas.current.get(id)?.offsetHeight ?? 0)
    const novos = empacotar(alturas, disponivel).map((g) => g.map((i) => ids[i]!))
    if (JSON.stringify(novos) !== JSON.stringify(grupos)) setGrupos(novos)
    // `conteudo` muda as alturas sem mudar quem está: mede de novo.
  }, [chave, conteudo, grupos])

  const pessoaPorId = new Map(c.pessoas.map((p) => [p.id, p]))
  return (
    <section
      aria-label={c.nome}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[18px] bg-tv-cartao"
      style={{ width: larguraColuna(atuais.length) }}
    >
      <div className="h-2.5 shrink-0" style={{ background: c.cor }} />
      <h2 className="border-b border-tv-linha px-[22px] pt-4 pb-3.5 text-[40px] leading-none font-bold">
        {c.nome}
      </h2>
      <div ref={corpo} className="flex min-h-0 flex-1 gap-7 px-[22px] pt-1.5 pb-3.5">
        {atuais.map((grupo, i) => (
          <ul key={i} className="flex w-[436px] shrink-0 flex-col">
            {grupo.map((id) => {
              const p = pessoaPorId.get(id)
              if (!p) return null
              return (
                <li
                  key={id}
                  ref={(el) => {
                    if (el) linhas.current.set(id, el)
                    else linhas.current.delete(id)
                  }}
                  className="flex flex-col gap-2.5 border-b border-tv-linha py-3.5"
                >
                  <span className="flex items-baseline justify-between gap-2.5">
                    <span
                      className={`text-[28px] leading-[1.05] font-bold ${p.pendencia ? 'text-tv-alerta' : ''}`}
                    >
                      {p.nome}
                    </span>
                    <span
                      className={`shrink-0 text-[17px] whitespace-nowrap ${p.pendencia ? 'text-tv-alerta' : 'text-tv-texto-2'}`}
                    >
                      {p.pendencia ?? p.retirouAs?.replace('Retirou às ', '')}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {p.todas.map((f) => (
                      <span
                        key={f.tipo}
                        className="flex max-w-full min-w-0 items-center gap-2 rounded-full bg-tv-chip py-1 pr-3.5 pl-1"
                      >
                        {ehIcone(f.icone) && (
                          <CirculoFerramenta icone={f.icone} circulo="size-10" svg={24} />
                        )}
                        <span className="truncate text-lg font-semibold">
                          {f.tipo}
                          {f.quantidade > 1 && ` ×${f.quantidade}`}
                        </span>
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </section>
  )
}

function porSeis(ids: string[]): string[][] {
  const grupos: string[][] = []
  for (let i = 0; i < ids.length; i += PESSOAS_POR_SUBCOLUNA) {
    grupos.push(ids.slice(i, i + PESSOAS_POR_SUBCOLUNA))
  }
  return grupos
}
