'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoPessoaLancamento } from '@/components/CartaoPessoaLancamento'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { RodapeAcao } from '@/components/RodapeAcao'
import {
  limitarAvariadas,
  rotuloMotivo,
  textoFicaComEle,
  textoRegistrar,
  type GrupoDevolucao,
} from '@/lib/dominio/devolucao'
import type { TextoIdentificacao } from '@/lib/dominio/ficha'
import { formatarHora } from '@/lib/formatos/datas'
import { registrarDevolucao, type FalhaDevolucao } from './acoes'
import { descartarFoto, FotoAvaria, type FotoFeita } from './FotoAvaria'

type Props = {
  obraId: string
  /** "Ana (almoxarife)" para o carimbo da foto. */
  autor: string
  pessoa: { id: string; nome: string; primeiro: string; iniciais: string }
  identificacao: TextoIdentificacao
  /** Id da conferência do capacete; null = sem QR (só volta o que saiu sem QR). */
  conferencia: string | null
  /** O que pode voltar agora (com QR: tudo; sem QR: só o que saiu sem QR). */
  grupos: GrupoDevolucao[]
  /** Tudo o que está com a pessoa, por tipo, para o "Fica com ele". */
  todos: GrupoDevolucao[]
  voltarParaFicha: string
}

function IconeCamera() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

const SELO_ENTRADA = (
  <span className="rounded-full bg-escuro px-3 py-1 text-xs font-bold tracking-wide text-white">
    ENTRADA
  </span>
)

function Contador(props: {
  rotulo: string
  ajuda?: string
  valor: number
  /** " de N" em letra menor, como no protótipo. */
  de?: number
  /** Painel: fundo cinza claro (Devolvendo) ou com borda (Avariadas). */
  painel: 'cheio' | 'borda'
  menos: () => void
  mais: () => void
  podeMenos: boolean
  podeMais: boolean
  nome: string
  alerta?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-botao px-3 py-2 ${
        props.painel === 'cheio' ? 'bg-sutil' : 'border border-borda'
      }`}
    >
      <span className="flex flex-1 flex-col">
        <span className={`text-[15px] font-semibold ${props.alerta ? 'text-erro' : ''}`}>
          {props.rotulo}
        </span>
        {props.ajuda && <span className="text-xs text-texto-2">{props.ajuda}</span>}
      </span>
      <button
        type="button"
        aria-label={`Menos uma: ${props.nome}`}
        disabled={!props.podeMenos}
        onClick={props.menos}
        className="size-toque rounded-botao border border-borda bg-cartao text-xl font-bold disabled:opacity-35"
      >
        −
      </button>
      <output
        aria-live="polite"
        className={`min-w-16 text-center tabular-nums ${props.alerta ? 'text-erro' : ''}`}
      >
        <span className="text-[28px] leading-none font-bold">{props.valor}</span>
        {props.de !== undefined && <span className="text-sm text-texto-2"> de {props.de}</span>}
      </output>
      <button
        type="button"
        aria-label={`Mais uma: ${props.nome}`}
        disabled={!props.podeMais}
        onClick={props.mais}
        className="size-toque rounded-botao border border-borda bg-cartao text-xl font-bold disabled:opacity-35"
      >
        +
      </button>
    </div>
  )
}

/** Devolução (F-06): por tipo, "Devolvendo" e "Avariadas" com foto por peça (RN-09). */
export function FluxoDevolucao(props: Props) {
  const { obraId, autor, pessoa, identificacao, conferencia, grupos, todos, voltarParaFicha } =
    props
  const [dev, setDev] = useState<Record<string, number>>({})
  const [avarias, setAvarias] = useState<Record<string, (FotoFeita | null)[]>>({})
  const [fotografando, setFotografando] = useState<{ tipoId: string; indice: number } | null>(null)
  const [falha, setFalha] = useState<FalhaDevolucao | null>(null)
  const [chave] = useState(() => crypto.randomUUID())
  const [enviando, iniciar] = useTransition()

  const totais = Object.fromEntries(todos.map((g) => [g.tipoId, g.codigos.length]))
  const total = grupos.reduce((s, g) => s + (dev[g.tipoId] ?? 0), 0)
  const faltaFoto = grupos.some((g) => (avarias[g.tipoId] ?? []).some((a) => a === null))

  /** Ajusta as avariadas do tipo; fotos que saem da lista são descartadas (Storage e prévia). */
  function definirAvariadas(tipoId: string, n: number) {
    const atual = avarias[tipoId] ?? []
    atual.slice(n).forEach(descartarFoto)
    const nova =
      n > atual.length ? [...atual, ...Array<null>(n - atual.length).fill(null)] : atual.slice(0, n)
    setAvarias({ ...avarias, [tipoId]: nova })
  }

  function mudarDevolvendo(tipoId: string, valor: number) {
    setDev((d) => ({ ...d, [tipoId]: valor }))
    definirAvariadas(tipoId, limitarAvariadas(avarias[tipoId]?.length ?? 0, valor))
  }

  function mudarAvariadas(tipoId: string, n: number) {
    definirAvariadas(tipoId, n)
  }

  function registrar() {
    setFalha(null)
    iniciar(async () => {
      try {
        const r = await registrarDevolucao({
          pessoaId: pessoa.id,
          identificacao: conferencia,
          chave,
          itens: grupos
            .filter((g) => (dev[g.tipoId] ?? 0) > 0)
            .map((g) => ({
              tipo: g.tipoId,
              quantidade: dev[g.tipoId] ?? 0,
              avarias: (avarias[g.tipoId] ?? []).flatMap((a) =>
                a ? [{ motivo: a.motivo, foto: a.foto, detalhes: a.detalhes }] : [],
              ),
            })),
        })
        setFalha(r)
      } catch (e) {
        const digest = (e as { digest?: unknown } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw e
        setFalha({
          erro: 'Não deu para confirmar com o Almox. Toque em "Registrar devolução" de novo: se já tiver sido registrada, não repete.',
          motivo: 'outro',
        })
      }
    })
  }

  if (fotografando) {
    const grupo = grupos.find((g) => g.tipoId === fotografando.tipoId)
    const n = avarias[fotografando.tipoId]?.length ?? 1
    return (
      <FotoAvaria
        obraId={obraId}
        autor={autor}
        tipo={grupo?.tipo ?? ''}
        qual={n > 1 ? `· avariada ${fotografando.indice + 1} de ${n}` : ''}
        selo={SELO_ENTRADA}
        aoVoltar={() => setFotografando(null)}
        aoUsar={(f) => {
          const lista = [...(avarias[fotografando.tipoId] ?? [])]
          descartarFoto(lista[fotografando.indice]) // "Refazer": a foto anterior sai
          lista[fotografando.indice] = f
          setAvarias({ ...avarias, [fotografando.tipoId]: lista })
          setFotografando(null)
        }}
      />
    )
  }

  return (
    <>
      <Cabecalho
        titulo="Devolução"
        subtitulo="Marque o que voltou"
        voltarPara={voltarParaFicha}
        selo={SELO_ENTRADA}
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
        <CartaoPessoaLancamento pessoa={pessoa} identificacao={identificacao} />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            {conferencia ? 'COM ELE AGORA' : 'PEGOU SEM QR · PODE DEVOLVER SEM QR'}
          </h2>
          <button
            type="button"
            onClick={() => grupos.forEach((g) => mudarDevolvendo(g.tipoId, g.codigos.length))}
            className="min-h-toque shrink-0 text-sm font-bold underline"
          >
            Devolveu tudo
          </button>
        </div>
        {grupos.map((g) => {
          const q = dev[g.tipoId] ?? 0
          const av = avarias[g.tipoId] ?? []
          return (
            <section
              key={g.tipoId}
              aria-label={g.tipo}
              className={`flex flex-col gap-3 rounded-cartao border-2 bg-cartao px-4 py-3 ${q > 0 ? 'border-escuro' : 'border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Devolver mais uma ${g.tipo}`}
                  disabled={q >= g.codigos.length}
                  onClick={() => mudarDevolvendo(g.tipoId, q + 1)}
                  className="shrink-0 rounded-full disabled:opacity-60"
                >
                  {ehChaveIcone(g.icone) && <IconeFerramenta icone={g.icone} nome={g.tipo} />}
                </button>
                <span className="text-[13px] text-texto-2">
                  Toque no ícone: +1 · com ele: {g.codigos.length} ·{' '}
                  <span className="font-mono">{g.codigos.join(', ')}</span>
                </span>
              </div>
              <Contador
                rotulo="Devolvendo"
                nome={`devolvendo ${g.tipo}`}
                valor={q}
                de={g.codigos.length}
                painel="cheio"
                podeMenos={q > 0}
                podeMais={q < g.codigos.length}
                menos={() => mudarDevolvendo(g.tipoId, q - 1)}
                mais={() => mudarDevolvendo(g.tipoId, q + 1)}
              />
              {q > 0 && (
                <Contador
                  rotulo="Avariadas"
                  ajuda="das que estão voltando"
                  nome={`avariadas ${g.tipo}`}
                  valor={av.length}
                  painel="borda"
                  alerta={av.length > 0}
                  podeMenos={av.length > 0}
                  podeMais={av.length < q}
                  menos={() => mudarAvariadas(g.tipoId, av.length - 1)}
                  mais={() => mudarAvariadas(g.tipoId, av.length + 1)}
                />
              )}
              {av.map((a, i) =>
                a ? (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-cartao bg-erro-claro px-3 py-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
                    <img src={a.previa} alt="" className="size-12 rounded-botao object-cover" />
                    <span className="flex flex-1 flex-col text-sm">
                      <span className="font-bold text-erro">Foto anexada</span>
                      <span>
                        {rotuloMotivo(a.motivo)} · foto {formatarHora(a.hora)}
                      </span>
                      {a.detalhes && <span className="text-texto-2">{a.detalhes}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFotografando({ tipoId: g.tipoId, indice: i })}
                      className="min-h-toque px-2 text-sm font-bold underline"
                    >
                      Refazer
                    </button>
                  </div>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFotografando({ tipoId: g.tipoId, indice: i })}
                    className="flex min-h-toque items-center justify-center gap-2 rounded-botao bg-erro px-4 font-bold text-white"
                  >
                    <IconeCamera />
                    Fotografar a avaria{av.length > 1 ? ` ${i + 1}` : ''}
                  </button>
                ),
              )}
            </section>
          )
        })}
        {falha && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-cartao bg-erro-claro px-4 py-3 text-erro"
          >
            <p className="font-semibold">{falha.erro}</p>
            {falha.motivo === 'conferencia' && (
              <Link href="/leitura" className="font-bold underline">
                Ler o capacete do {pessoa.primeiro}
              </Link>
            )}
          </div>
        )}
      </main>
      <RodapeAcao
        resumo={
          <span className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 font-normal text-texto-2">Fica com ele</span>
            <span className="truncate">{textoFicaComEle(todos, dev, totais)}</span>
          </span>
        }
      >
        <Botao
          type="button"
          variante="escura"
          tamanho="g"
          larguraTotal
          disabled={total === 0 || faltaFoto || enviando}
          onClick={registrar}
        >
          {enviando ? 'Registrando…' : textoRegistrar(total, faltaFoto)}
        </Botao>
      </RodapeAcao>
    </>
  )
}
