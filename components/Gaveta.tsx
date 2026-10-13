'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconeInterface } from './IconeInterface'

export type ItemGaveta = {
  href: string
  icone: ReactNode
  titulo: string
  detalhe?: string
  tom?: 'neutro' | 'ok' | 'erro' | 'aviso' | 'info'
}

type Props = {
  /** Rótulo do botão para leitor de tela (o botão só tem ícone). */
  rotulo: string
  /** Ícone do botão. */
  icone: ReactNode
  /** Bolinha no canto do botão (ex.: verde = impressora pronta). */
  marca?: 'ok' | 'erro'
  titulo: string
  itens: ItemGaveta[]
}

const BOLA = {
  neutro: 'bg-sutil text-texto',
  ok: 'bg-sucesso-claro text-sucesso',
  erro: 'bg-erro-claro text-erro',
  aviso: 'bg-aviso-claro text-aviso',
  info: 'bg-engenheiro-claro text-engenheiro',
} as const

const DETALHE = {
  neutro: 'text-texto-2',
  ok: 'text-sucesso',
  erro: 'text-erro',
  aviso: 'text-texto-2',
  info: 'text-texto-2',
} as const

/**
 * Botão só com ícone no cabeçalho que abre uma gaveta de atalhos por baixo (Cadastros:
 * impressora e TV; Início: gestão). Esc fecha e devolve o foco ao botão.
 */
export function Gaveta({ rotulo, icone, marca, titulo, itens }: Props) {
  const [aberto, setAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const gaveta = useRef<HTMLDivElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!aberto) return
    gaveta.current?.querySelector('a')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto])

  const fechar = () => setAberto(false)

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto(true)}
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="relative flex size-toque shrink-0 items-center justify-center rounded-botao border border-borda bg-cartao"
      >
        {icone}
        {marca && (
          <span
            aria-hidden="true"
            className={`absolute top-2 right-2 size-2.5 rounded-full border-2 border-cartao ${
              marca === 'ok' ? 'bg-sucesso' : 'bg-erro'
            }`}
          />
        )}
      </button>
      {aberto && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="absolute inset-0 bg-[rgba(16,23,32,0.55)]"
          />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            className="relative mx-auto w-full max-w-[520px] rounded-t-[20px] bg-cartao px-5 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block h-1 w-10 rounded-full bg-borda"
            />
            <h2 id={idTitulo} className="mb-1 text-lg font-bold">
              {titulo}
            </h2>
            {itens.map((item) => {
              const tom = item.tom ?? 'neutro'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={fechar}
                  className="flex min-h-15 items-center gap-3 border-b border-borda py-2 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${BOLA[tom]}`}
                  >
                    {item.icone}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`text-[15px] font-bold ${tom === 'info' ? 'text-engenheiro' : ''}`}
                    >
                      {item.titulo}
                    </span>
                    {item.detalhe && (
                      <span className={`truncate text-[13px] ${DETALHE[tom]}`}>{item.detalhe}</span>
                    )}
                  </span>
                  <IconeInterface
                    nome="chevron-right"
                    tamanho={18}
                    className="shrink-0 text-texto-2"
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
