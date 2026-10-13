'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AbasCadastros } from '@/components/AbasCadastros'
import { CirculoFerramenta } from '@/components/IconeFerramenta'
import { IconeInterface } from '@/components/IconeInterface'
import { ehIcone } from '@/components/icones-ferramenta'
import {
  LIMITE_POR_GRUPO,
  buscarCadastros,
  prepararBusca,
  hrefCadastro,
  type ItemBusca,
} from '@/lib/dominio/busca-cadastros'

/** Botão "Novo" de cada aba (rótulo curto na tela, completo para leitor de tela). */
const NOVO: Record<string, { href: string; rotulo: string; completo: string }> = {
  '/cadastros/pessoas': { href: '/cadastros/pessoa/nova', rotulo: 'Nova', completo: 'Nova pessoa' },
  '/cadastros/ferramentas': {
    href: '/cadastros/ferramenta/nova',
    rotulo: 'Nova',
    completo: 'Nova ferramenta',
  },
  '/cadastros/empresas': {
    href: '/cadastros/empresa/nova',
    rotulo: 'Nova',
    completo: 'Nova empresa',
  },
  '/cadastros/usuarios': {
    href: '/cadastros/acesso/novo',
    rotulo: 'Dar acesso',
    completo: 'Dar acesso',
  },
}

type Props = { indice: ItemBusca[]; children: ReactNode }

function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

/** Avatar da pessoa, ícone da ferramenta ou bolinha da empresa, como nas listas. */
function Marcador({ item }: { item: ItemBusca }) {
  if (item.tipo === 'ferramenta' && item.icone && ehIcone(item.icone)) {
    return <CirculoFerramenta icone={item.icone} circulo="size-10" svg={22} />
  }
  if (item.tipo === 'pessoa') {
    return (
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          item.inativo ? 'bg-sutil text-texto-2' : 'bg-escuro text-amarelo'
        }`}
      >
        {iniciais(item.nome)}
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sutil"
    >
      <span
        className="size-4 rounded-full"
        style={{ background: item.cor ?? 'var(--color-borda)' }}
      />
    </span>
  )
}

/**
 * Abas, busca geral e botão Novo das listas de cadastro. Com algo digitado, a lista da aba dá
 * lugar ao resultado em todos os cadastros (pessoas, ferramentas e empresas), por grupo.
 */
export function BuscaCadastros({ indice, children }: Props) {
  const caminho = usePathname()
  const [termo, setTermo] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  // Internet fraca: o que foi digitado antes de a tela ficar interativa não se perde.
  useEffect(() => {
    const jaDigitado = entrada.current?.value ?? ''
    if (jaDigitado) setTermo(jaDigitado)
  }, [])
  const novo = NOVO[caminho]
  // Textos sem acento preparados uma vez; a digitação não espera a filtragem (resultado adiado).
  const preparada = useMemo(() => prepararBusca(indice), [indice])
  const termoAdiado = useDeferredValue(termo)
  const resultado = useMemo(() => buscarCadastros(preparada, termoAdiado), [preparada, termoAdiado])
  const buscando = termo.trim().length > 0

  return (
    <>
      <div className="flex flex-col gap-2.5 px-5 pb-3">
        <AbasCadastros />
        <div className="flex gap-2">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-botao border border-borda bg-cartao px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco">
            <IconeInterface nome="search" tamanho={20} className="shrink-0 text-texto-2" />
            <span className="sr-only">Buscar pessoa, ferramenta ou empresa</span>
            <input
              ref={entrada}
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar em tudo"
              enterKeyHint="search"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
            />
          </label>
          {novo && (
            <Link
              href={novo.href}
              aria-label={novo.completo}
              className="flex h-12 shrink-0 items-center gap-1 rounded-botao bg-amarelo px-3.5 text-[15px] font-bold text-escuro"
            >
              <IconeInterface nome="plus" tamanho={18} />
              {novo.rotulo}
            </Link>
          )}
        </div>
      </div>
      <main className="flex flex-1 flex-col gap-2 px-5 pb-6">
        {!buscando ? (
          children
        ) : resultado.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-texto-2">
            Nada encontrado com “{termo.trim()}”.
          </p>
        ) : (
          resultado.map((g) => (
            <section key={g.tipo} aria-label={g.titulo} className="flex flex-col gap-2">
              <h2 className="mt-1 text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">
                {g.titulo} · {g.itens.length}
              </h2>
              {g.itens.slice(0, LIMITE_POR_GRUPO).map((i) => (
                <Link
                  key={i.id}
                  href={hrefCadastro(i)}
                  className="flex min-h-14 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-2.5"
                >
                  <Marcador item={i} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-bold">{i.nome}</span>
                    <span className="truncate text-[13px] text-texto-2">
                      {i.detalhe}
                      {i.inativo && ' · inativa'}
                    </span>
                  </span>
                  <IconeInterface
                    nome="chevron-right"
                    tamanho={18}
                    className="shrink-0 text-texto-2"
                  />
                </Link>
              ))}
              {g.itens.length > LIMITE_POR_GRUPO && (
                <p className="text-center text-[13px] text-texto-2">
                  Mais {g.itens.length - LIMITE_POR_GRUPO}: digite mais para achar.
                </p>
              )}
            </section>
          ))
        )}
      </main>
    </>
  )
}
