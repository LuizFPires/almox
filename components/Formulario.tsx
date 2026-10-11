'use client'

import Link from 'next/link'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { IconeInterface } from './IconeInterface'

export const CLASSE_CAMPO =
  'min-h-toque w-full rounded-botao border border-borda bg-cartao px-3 text-base text-texto aria-[invalid=true]:border-erro'

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  ajuda?: ReactNode
  erro?: string
  /** Texto fixo à esquerda do campo (ex.: "R$"). */
  prefixo?: string
}

/** Campo de texto com rótulo, ajuda e erro ligados por aria. */
export function Campo({
  rotulo,
  ajuda,
  erro,
  prefixo,
  id,
  name,
  className = '',
  ...resto
}: PropsCampo) {
  // useId: o Next mantém telas anteriores escondidas no DOM; id fixo repetiria entre elas.
  const automatico = useId()
  const campoId = id ?? `campo-${name}-${automatico}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-semibold">
        {rotulo}
      </label>
      <div className="relative">
        {prefixo && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-texto-2"
          >
            {prefixo}
          </span>
        )}
        <input
          id={campoId}
          name={name}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${campoId}-erro` : ajuda ? `${campoId}-ajuda` : undefined}
          className={`${CLASSE_CAMPO} ${prefixo ? 'pl-10!' : ''} ${className}`}
          {...resto}
        />
      </div>
      {erro ? (
        <span id={`${campoId}-erro`} className="text-sm font-semibold text-erro">
          {erro}
        </span>
      ) : (
        ajuda && (
          <span id={`${campoId}-ajuda`} className="text-sm text-texto-2">
            {ajuda}
          </span>
        )
      )}
    </div>
  )
}

/** Título de seção dentro de um formulário. */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-[13px] font-bold tracking-[1.2px] text-texto-2">{titulo}</legend>
      {children}
    </fieldset>
  )
}

/** Mensagem de erro geral do formulário (falha ao salvar). */
export function ErroFormulario({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return (
    <p role="alert" className="rounded-botao bg-erro-claro px-3 py-2.5 text-[15px] text-erro">
      {mensagem}
    </p>
  )
}

/** Botão "Nova …" das listas: largura total, logo abaixo das abas (protótipo). */
export function BotaoNovo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-center gap-2 rounded-cartao border-2 border-dashed border-engenheiro bg-cartao text-[17px] font-bold text-engenheiro"
    >
      <IconeInterface nome="plus" tamanho={20} />
      {children}
    </Link>
  )
}
