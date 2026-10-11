'use client'

import Link from 'next/link'
import { useState } from 'react'
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

function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

/** Busca e lista da escolha manual (F-08); abrir conta como "sem QR". */
export function BuscaPessoas({ pessoas }: { pessoas: Pessoa[] }) {
  const [busca, setBusca] = useState('')
  const achadas = filtrarPessoas(pessoas, busca)
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Buscar pelo nome</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome"
          autoComplete="off"
          className="min-h-14 rounded-cartao border-[1.5px] border-escuro bg-cartao px-4 text-[17px]"
        />
      </label>
      {achadas.length === 0 && (
        <p className="py-6 text-center text-[15px] text-texto-2">Ninguém com esse nome.</p>
      )}
      <ul className="flex flex-col gap-2">
        {achadas.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pessoa/${p.id}?via=manual`}
              className="flex min-h-16 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-escuro text-[15px] font-bold text-amarelo"
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
    </>
  )
}
