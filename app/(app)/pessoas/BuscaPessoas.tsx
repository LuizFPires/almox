'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { IconeInterface } from '@/components/IconeInterface'
import { filtrarPessoas } from '@/lib/dominio/busca'
import { contarItens } from '@/lib/dominio/ficha'

type Pessoa = {
  id: string
  nome: string
  nome_capacete: string
  funcao: string
  empresa: string
  itens: number
}

/** Quantas pessoas montar por vez (obra grande tem centenas; a busca alcança todas). */
const LOTE = 60

function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

/** Busca e lista da escolha manual (F-08); abrir conta como "sem QR". */
export function BuscaPessoas({ pessoas }: { pessoas: Pessoa[] }) {
  const [busca, setBusca] = useState('')
  const [quantas, setQuantas] = useState(LOTE)
  // A digitação não espera a filtragem; só os primeiros LOTE vão para a tela.
  const buscaAdiada = useDeferredValue(busca)
  const achadas = useMemo(() => filtrarPessoas(pessoas, buscaAdiada), [pessoas, buscaAdiada])
  const mostradas = achadas.slice(0, quantas)
  return (
    <>
      <label className="relative flex items-center">
        <span className="sr-only">Buscar pelo nome</span>
        <IconeInterface
          nome="search"
          tamanho={20}
          className="pointer-events-none absolute left-4 text-texto-2"
        />
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setQuantas(LOTE)
          }}
          placeholder="Buscar pelo nome"
          autoComplete="off"
          className="min-h-14 w-full rounded-cartao border-[1.5px] border-escuro bg-cartao pr-4 pl-12 text-[17px]"
        />
      </label>
      {achadas.length === 0 && (
        <p className="py-6 text-center text-[15px] text-texto-2">Ninguém com esse nome.</p>
      )}
      <ul className="flex flex-col gap-2">
        {mostradas.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pessoa/${p.id}?via=manual`}
              className="flex min-h-16 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sutil text-[15px] font-bold text-texto"
              >
                {iniciais(p.nome)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-bold">{p.nome}</span>
                <span className="truncate text-[13px] text-texto-2">
                  {p.nome_capacete} · {p.funcao} · {p.empresa}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-sutil px-2.5 py-1 text-[13px] font-semibold">
                {contarItens(p.itens)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {achadas.length > mostradas.length && (
        <button
          type="button"
          onClick={() => setQuantas((n) => n + LOTE)}
          className="min-h-toque rounded-cartao border border-borda bg-cartao px-4 font-semibold"
        >
          Mostrar mais {Math.min(LOTE, achadas.length - mostradas.length)} de{' '}
          {achadas.length - mostradas.length}
        </button>
      )}
    </>
  )
}
