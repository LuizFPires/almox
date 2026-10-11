import Link from 'next/link'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { IconeInterface } from './IconeInterface'

export const CLASSE_CAMPO =
  'min-h-toque w-full rounded-botao border border-borda bg-cartao px-3 text-base text-texto aria-[invalid=true]:border-erro'

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  ajuda?: ReactNode
  erro?: string
}

/** Campo de texto com rótulo, ajuda e erro ligados por aria. */
export function Campo({ rotulo, ajuda, erro, id, name, className = '', ...resto }: PropsCampo) {
  const campoId = id ?? `campo-${name}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-semibold">
        {rotulo}
      </label>
      <input
        id={campoId}
        name={name}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${campoId}-erro` : ajuda ? `${campoId}-ajuda` : undefined}
        className={`${CLASSE_CAMPO} ${className}`}
        {...resto}
      />
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

/** Botão flutuante "Nova …" das listas. */
export function BotaoNovo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="fixed right-[max(1.25rem,calc(50vw-240px+1.25rem))] bottom-[calc(76px+env(safe-area-inset-bottom)+16px)] flex min-h-14 items-center gap-2 rounded-full bg-amarelo px-5 text-[17px] font-bold text-texto shadow-lg"
    >
      <IconeInterface nome="plus" tamanho={20} />
      {children}
    </Link>
  )
}
