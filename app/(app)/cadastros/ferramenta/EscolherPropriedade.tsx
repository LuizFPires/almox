'use client'

import { useState } from 'react'
import { IconeInterface } from '@/components/IconeInterface'
import { normalizarTexto } from '@/lib/formatos/texto'

export type OpcaoLocadora = { id: string; nome: string; ferramentas: number }

type Props = {
  locadoras: OpcaoLocadora[]
  inicial: { propriedade: 'propria' | 'alugada'; locadoraId: string | null }
  erro?: string
}

/**
 * "De quem é" (opção B do protótipo): Própria ou Alugada. Alugada: busca nas locadoras já
 * usadas na obra (um toque escolhe) ou "Adicionar" uma nova, que fica salva para os próximos
 * cadastros. Vai no formulário como `propriedade`, `locadora_id` e `locadora_nova`.
 */
export function EscolherPropriedade({ locadoras, inicial, erro }: Props) {
  const [propriedade, setPropriedade] = useState(inicial.propriedade)
  const [escolhida, setEscolhida] = useState<string | null>(inicial.locadoraId)
  const [nova, setNova] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const alugada = propriedade === 'alugada'

  const termo = normalizarTexto(busca)
  const visiveis = termo
    ? locadoras.filter((l) => normalizarTexto(l.nome).includes(termo))
    : locadoras
  const existe = locadoras.some((l) => normalizarTexto(l.nome) === termo)
  const podeAdicionar = termo.length >= 2 && !existe

  const cartao = (atual: boolean) =>
    `flex min-h-24 flex-col items-start gap-1.5 rounded-cartao border-2 bg-cartao p-3 text-left ${
      atual ? 'border-escuro' : 'border-borda'
    }`

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1.5 text-sm font-semibold">De quem é</legend>
      <input type="hidden" name="propriedade" value={propriedade} />
      <div role="radiogroup" aria-label="De quem é" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!alugada}
          onClick={() => setPropriedade('propria')}
          className={cartao(!alugada)}
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-botao bg-sucesso-claro text-sucesso"
          >
            <IconeInterface nome="box" tamanho={20} />
          </span>
          <span className="font-bold">Própria</span>
          <span className="text-xs text-texto-2">Da construtora</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={alugada}
          onClick={() => setPropriedade('alugada')}
          className={cartao(alugada)}
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-botao bg-aviso-claro text-aviso"
          >
            <IconeInterface nome="transfer" tamanho={20} />
          </span>
          <span className="font-bold">Alugada</span>
          <span className="text-xs text-texto-2">De uma locadora</span>
        </button>
      </div>

      {alugada && (
        <section aria-label="Locadora" className="flex flex-col gap-2">
          <input type="hidden" name="locadora_id" value={nova ? '' : (escolhida ?? '')} />
          <input type="hidden" name="locadora_nova" value={nova ?? ''} />
          <span className="text-sm font-semibold">Locadora</span>
          <label className="flex h-12 items-center gap-2 rounded-botao border border-borda bg-cartao px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco">
            <IconeInterface nome="search" tamanho={20} className="shrink-0 text-texto-2" />
            <span className="sr-only">Buscar locadora</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ou digitar uma nova"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
            />
          </label>
          <ul
            role="radiogroup"
            aria-label="Locadoras"
            className="flex flex-col divide-y divide-sutil overflow-hidden rounded-cartao bg-cartao"
          >
            {nova && (
              <li>
                <button
                  type="button"
                  role="radio"
                  aria-checked
                  onClick={() => setNova(null)}
                  className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left"
                >
                  <Bolinha marcada />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-bold">{nova}</span>
                    <span className="text-xs text-engenheiro">Nova: fica salva ao salvar</span>
                  </span>
                </button>
              </li>
            )}
            {visiveis.map((l) => {
              const marcada = !nova && escolhida === l.id
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={marcada}
                    onClick={() => {
                      setEscolhida(l.id)
                      setNova(null)
                    }}
                    className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left"
                  >
                    <Bolinha marcada={marcada} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-bold">{l.nome}</span>
                      <span className="text-xs text-texto-2">
                        {l.ferramentas === 0
                          ? 'nenhuma ferramenta ainda'
                          : `${l.ferramentas} ${l.ferramentas === 1 ? 'ferramenta alugada' : 'ferramentas alugadas'}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
            {podeAdicionar && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setNova(busca.replace(/\s+/g, ' ').trim())
                    setBusca('')
                  }}
                  className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left font-bold text-engenheiro"
                >
                  <IconeInterface nome="plus" tamanho={20} />
                  Adicionar “{busca.trim()}”
                </button>
              </li>
            )}
            {locadoras.length === 0 && !podeAdicionar && !nova && (
              <li className="px-4 py-4 text-[15px] text-texto-2">
                Nenhuma locadora ainda: digite o nome acima.
              </li>
            )}
          </ul>
          {erro && <span className="text-sm font-semibold text-erro">{erro}</span>}
        </section>
      )}
    </fieldset>
  )
}

function Bolinha({ marcada = false }: { marcada?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
        marcada ? 'border-escuro' : 'border-texto-2'
      }`}
    >
      {marcada && <span className="size-2.5 rounded-full bg-escuro" />}
    </span>
  )
}
