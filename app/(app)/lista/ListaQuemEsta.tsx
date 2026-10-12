'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { IconeInterface } from '@/components/IconeInterface'
import { textoDesde } from '@/lib/dominio/ficha'
import {
  agruparPorEmpresa,
  resumoGrupo,
  textoSemFerramenta,
  type PessoaLista,
} from '@/lib/dominio/lista'

type Props = {
  pessoas: PessoaLista[]
  empresas: { id: string; nome: string; cor: string }[]
  /** Momento do servidor (ISO), para "desde ontem" bater com o resto do app. */
  agora: string
}

/** "Quem está com o quê" (F-07): por empresa, com busca por nome, apelido ou código. */
export function ListaQuemEsta({ pessoas, empresas, agora }: Props) {
  const [busca, setBusca] = useState('')
  const momento = new Date(agora)
  const grupos = agruparPorEmpresa(pessoas, empresas, busca, momento)

  return (
    <>
      <label className="relative flex items-center">
        <span className="sr-only">Buscar pessoa ou código da peça</span>
        <IconeInterface
          nome="search"
          tamanho={20}
          className="pointer-events-none absolute left-4 text-texto-2"
        />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pessoa ou código da peça"
          autoComplete="off"
          className="min-h-12 w-full rounded-cartao border-[1.5px] border-escuro bg-cartao pr-4 pl-12 text-[17px]"
        />
      </label>
      {grupos.length === 0 && (
        <p className="py-6 text-center text-[15px] text-texto-2">
          {busca.trim() ? 'Ninguém encontrado.' : 'Ninguém está com ferramenta agora.'}
        </p>
      )}
      {grupos.map((g) => (
        <section key={g.empresa.id} aria-label={g.empresa.nome} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ background: g.empresa.cor }}
            />
            <span className="flex-1 font-bold">{g.empresa.nome}</span>
            <span className="text-[13px] text-texto-2">
              {resumoGrupo(g.totalItens, g.pessoas.length)}
            </span>
          </h2>
          {g.pessoas.map((p) => (
            <Link
              key={p.id}
              href={`/pessoa/${p.id}?volta=/lista`}
              className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {p.nome}
                    {p.pendenteDesde && (
                      <span className="text-erro"> · {textoDesde(p.pendenteDesde, momento)}</span>
                    )}
                  </span>
                  <span className="text-[13px] text-texto-2">{p.funcao}</span>
                </span>
                <IconeInterface nome="chevron-right" tamanho={18} className="text-texto-2" />
              </span>
              <span className="flex flex-wrap gap-1.5">
                {p.itens.map((i) => (
                  <span
                    key={i.codigo}
                    className="flex items-center gap-1.5 rounded-full bg-sutil py-1 pr-3 pl-1"
                  >
                    {ehChaveIcone(i.icone) && (
                      <IconeFerramenta icone={i.icone} nome={i.tipo} tamanho="p" />
                    )}
                    <span className="font-mono text-[11px] text-texto-2">{i.codigo}</span>
                  </span>
                ))}
              </span>
            </Link>
          ))}
          {g.semFerramenta > 0 && (
            <p className="px-1 text-[13px] text-texto-2">{textoSemFerramenta(g.semFerramenta)}</p>
          )}
        </section>
      ))}
    </>
  )
}
