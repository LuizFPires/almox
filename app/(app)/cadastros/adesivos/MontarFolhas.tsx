'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { IconeInterface } from '@/components/IconeInterface'
import {
  LIMITE_ADESIVOS,
  TAMANHOS_ADESIVO,
  distribuirFolhas,
  medidaCm,
  porFolha,
  type TamanhoAdesivo,
} from '@/lib/dominio/folha-adesivos'
import { formatarData } from '@/lib/formatos/datas'
import { normalizarTexto } from '@/lib/formatos/texto'
import type { PessoaAdesivo } from '@/lib/dados/pessoas'

type Props = {
  pessoas: PessoaAdesivo[]
  /** Já escolhidas ao abrir (ex.: vindo da ficha da pessoa). */
  iniciais: string[]
  tamanhoInicial: TamanhoAdesivo
  /** Para onde voltar depois de imprimir. */
  volta: string
  /** Abaixo da lista (ex.: impressora de etiquetas, quando a obra tem uma). */
  rodape?: ReactNode
}

const ORDEM: TamanhoAdesivo[] = ['grande', 'medio', 'pequeno']

/**
 * Montar a folha A4 (opção B do protótipo): tamanho do adesivo, espaços já usados da primeira
 * folha (folha aproveitada), "todos sem adesivo", "todos da obra" ou um por um. As folhas
 * seguintes vêm cheias. Imprimir abre a folha pronta, com o QR de cada um.
 */
export function MontarFolhas({ pessoas, iniciais, tamanhoInicial, volta, rodape }: Props) {
  const [tamanho, setTamanho] = useState<TamanhoAdesivo>(tamanhoInicial)
  const [usadas, setUsadas] = useState<number[]>([])
  const [escolhidos, setEscolhidos] = useState<string[]>(iniciais)
  const [pagina, setPagina] = useState(0)
  const [busca, setBusca] = useState('')
  const t = TAMANHOS_ADESIVO[tamanho]
  const total = porFolha(tamanho)

  const porId = new Map(pessoas.map((p) => [p.id, p]))
  const folhas = distribuirFolhas(escolhidos, tamanho, usadas)
  const pag = Math.min(pagina, folhas.length - 1)
  const folha = folhas[pag]!
  const naFolha = folha.filter((e) => e.tipo === 'item').length
  const sobram = folha.filter((e) => e.tipo === 'vazio').length
  const semAdesivo = pessoas.filter((p) => !p.temAdesivo)
  const cortado = (ids: string[]) => ids.slice(0, LIMITE_ADESIVOS)

  const termo = normalizarTexto(busca.trim())
  const visiveis = termo
    ? pessoas.filter((p) => normalizarTexto(`${p.nome} ${p.nomeCapacete}`).includes(termo))
    : pessoas

  function trocarTamanho(novo: TamanhoAdesivo) {
    setTamanho(novo)
    setUsadas((u) => u.filter((i) => i < porFolha(novo)).slice(0, porFolha(novo) - 1))
    setPagina(0)
  }

  function alternarUsada(espaco: number) {
    setUsadas((u) =>
      u.includes(espaco)
        ? u.filter((i) => i !== espaco)
        : u.length < total - 1
          ? [...u, espaco]
          : u,
    )
  }

  function alternarPessoa(id: string) {
    setEscolhidos((e) =>
      e.includes(id) ? e.filter((x) => x !== id) : e.length < LIMITE_ADESIVOS ? [...e, id] : e,
    )
  }

  const destino =
    `/cadastros/adesivos/a4?tamanho=${tamanho}` +
    `&pessoas=${escolhidos.join(',')}` +
    (usadas.length ? `&pular=${[...usadas].sort((a, b) => a - b).join(',')}` : '') +
    `&volta=${encodeURIComponent(volta)}`

  return (
    <>
      <div className="flex flex-col gap-3 px-5">
        <div
          role="radiogroup"
          aria-label="Tamanho do adesivo"
          className="grid grid-cols-3 gap-1 rounded-cartao bg-sutil p-1"
        >
          {ORDEM.map((nome) => {
            const atual = nome === tamanho
            const x = TAMANHOS_ADESIVO[nome]
            return (
              <button
                key={nome}
                type="button"
                role="radio"
                aria-checked={atual}
                onClick={() => trocarTamanho(nome)}
                className={`flex min-h-12 flex-col items-center justify-center rounded-botao text-sm leading-tight ${
                  atual ? 'bg-cartao font-bold shadow-sm' : 'font-medium text-texto-2'
                }`}
              >
                {x.rotulo}
                <span className="text-[11px] font-normal">
                  {porFolha(nome)} por folha · {medidaCm(nome)}
                </span>
              </button>
            )
          })}
        </div>

        <section
          aria-label="Folhas A4"
          className="flex flex-col gap-2 rounded-cartao bg-cartao px-3 py-3"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Folha anterior"
              disabled={pag === 0}
              onClick={() => setPagina(pag - 1)}
              className="flex size-toque items-center justify-center rounded-botao border border-borda text-xl font-bold disabled:text-borda"
            >
              ‹
            </button>
            <span className="flex flex-1 flex-col items-center text-center">
              <b className="text-[15px]">
                Folha {pag + 1} de {folhas.length}
              </b>
              <span className="text-xs text-texto-2">
                {pag === 0 ? 'Toque nos espaços já usados' : 'Folha nova, começa do 1º espaço'}
              </span>
            </span>
            <button
              type="button"
              aria-label="Próxima folha"
              disabled={pag >= folhas.length - 1}
              onClick={() => setPagina(pag + 1)}
              className="flex size-toque items-center justify-center rounded-botao border border-borda text-xl font-bold disabled:text-borda"
            >
              ›
            </button>
          </div>
          <div
            className="mx-auto grid w-full gap-1.5 rounded-botao bg-sutil p-2"
            style={{ gridTemplateColumns: `repeat(${t.colunas}, minmax(0, 1fr))`, maxWidth: 300 }}
          >
            {folha.map((e, i) => {
              const nome = e.tipo === 'item' ? porId.get(e.item)?.nomeCapacete : undefined
              return (
                <button
                  key={i}
                  type="button"
                  disabled={pag !== 0 || e.tipo === 'item'}
                  onClick={() => alternarUsada(i)}
                  aria-label={`Espaço ${i + 1}: ${
                    e.tipo === 'usado' ? 'já usado' : e.tipo === 'item' ? nome : 'livre'
                  }`}
                  className={`flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[6px] px-0.5 text-[10px] leading-tight ${
                    e.tipo === 'usado'
                      ? 'border border-borda bg-borda text-texto-2'
                      : e.tipo === 'item'
                        ? 'border-[1.5px] border-amarelo bg-aviso-claro font-bold text-texto'
                        : 'border-[1.5px] border-dashed border-texto-2 bg-cartao text-texto-2'
                  }`}
                  style={{ aspectRatio: `${t.larguraMm} / ${t.alturaMm}` }}
                >
                  {e.tipo === 'usado' ? (
                    <>
                      <IconeInterface nome="close" tamanho={16} />
                      já usado
                    </>
                  ) : e.tipo === 'item' ? (
                    <>
                      <IconeInterface nome="qr-code" tamanho={16} />
                      <span className="max-w-full truncate">{nome}</span>
                    </>
                  ) : (
                    i + 1
                  )}
                </button>
              )
            })}
          </div>
          <span className="text-center text-xs text-texto-2">
            {pag === 0 && usadas.length > 0 && `${usadas.length} já usados · `}
            {naFolha} nesta folha · {sobram} {sobram === 1 ? 'sobra' : 'sobram'}
          </span>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEscolhidos(cortado(semAdesivo.map((p) => p.id)))
              setPagina(0)
            }}
            className="min-h-toque rounded-botao border-2 border-escuro bg-cartao px-2 text-sm font-bold"
          >
            Todos sem adesivo ({semAdesivo.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEscolhidos(cortado(pessoas.map((p) => p.id)))
              setPagina(0)
            }}
            className="min-h-toque rounded-botao border-2 border-escuro bg-cartao px-2 text-sm font-bold"
          >
            Todos da obra ({pessoas.length})
          </button>
        </div>
        {escolhidos.length >= LIMITE_ADESIVOS && (
          <p role="status" className="text-center text-[13px] text-texto-2">
            Vão {LIMITE_ADESIVOS} por vez. Depois de imprimir, volte para os próximos.
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            OU ESCOLHA UM POR UM
          </span>
          <button
            type="button"
            onClick={() => {
              setEscolhidos([])
              setPagina(0)
            }}
            className="min-h-toque px-1 text-sm font-bold underline"
          >
            Limpar
          </button>
        </div>
        <label className="flex h-12 items-center gap-2 rounded-botao border border-borda bg-cartao px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco">
          <IconeInterface nome="search" tamanho={20} className="shrink-0 text-texto-2" />
          <span className="sr-only">Buscar pessoa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome ou capacete"
            className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
          />
        </label>
      </div>

      <ul
        aria-label="Pessoas"
        className="mx-5 mt-2 mb-4 flex flex-col divide-y divide-sutil rounded-cartao bg-cartao"
      >
        {visiveis.map((p) => {
          const marcada = escolhidos.includes(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={marcada}
                onClick={() => alternarPessoa(p.id)}
                className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{p.nome}</span>
                  <span
                    className={`truncate text-[13px] ${p.temAdesivo ? 'text-texto-2' : 'text-aviso'}`}
                  >
                    {p.nomeCapacete}
                    {p.empresa ? ` · ${p.empresa.nome}` : ''} ·{' '}
                    {p.impressoEm
                      ? `impresso ${formatarData(p.impressoEm).slice(0, 5)}`
                      : p.temAdesivo
                        ? 'com adesivo'
                        : 'sem adesivo'}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
                    marcada ? 'bg-escuro text-white' : 'bg-aviso-claro text-aviso'
                  }`}
                >
                  {marcada ? '✓' : '+'}
                </span>
              </button>
            </li>
          )
        })}
        {visiveis.length === 0 && (
          <li className="px-4 py-5 text-center text-[15px] text-texto-2">
            Ninguém com “{busca.trim()}”.
          </li>
        )}
      </ul>
      {rodape}
      {/* Espaço da barra fixa de imprimir. */}
      <div aria-hidden="true" className="h-28 shrink-0" />

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[480px] border-t border-borda bg-cartao px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {escolhidos.length === 0 ? (
          <span className="flex min-h-14 items-center justify-center rounded-cartao bg-borda text-lg font-bold text-texto-2">
            Escolha quem vai na folha
          </span>
        ) : (
          <Link
            href={destino}
            className="flex min-h-14 items-center justify-center rounded-cartao bg-amarelo px-4 text-lg font-bold text-escuro"
          >
            Imprimir {escolhidos.length} {escolhidos.length === 1 ? 'adesivo' : 'adesivos'} ·{' '}
            {folhas.length} {folhas.length === 1 ? 'folha' : 'folhas'}
          </Link>
        )}
      </div>
    </>
  )
}
