'use client'

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CLASSE_CAMPO } from './Formulario'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  rotulo: string
  ajuda?: ReactNode
  erro?: string
  /** Controla a visibilidade de fora (dois campos que mostram juntos: senha e confirmação). */
  visivel?: boolean
  aoAlternar?: () => void
  /** Sem o botão do olho (ex.: a confirmação, que segue o botão da senha). */
  semOlho?: boolean
}

/** Campo de senha com o "olho" para mostrar ou esconder o que foi digitado. */
export function CampoSenha({
  rotulo,
  ajuda,
  erro,
  visivel,
  aoAlternar,
  semOlho = false,
  id,
  name,
  className = '',
  ...resto
}: Props) {
  const automatico = useId()
  const campoId = id ?? `campo-${name}-${automatico}`
  const [visivelLocal, setVisivelLocal] = useState(false)
  const mostrar = visivel ?? visivelLocal
  const alternar = aoAlternar ?? (() => setVisivelLocal((v) => !v))
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-semibold">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={campoId}
          name={name}
          type={mostrar ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${campoId}-erro` : ajuda ? `${campoId}-ajuda` : undefined}
          className={`${CLASSE_CAMPO} ${semOlho ? '' : 'pr-14!'} ${className}`}
          {...resto}
        />
        {!semOlho && (
          <button
            type="button"
            onClick={alternar}
            aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
            aria-pressed={mostrar}
            aria-controls={campoId}
            className="absolute top-0 right-0 flex size-toque items-center justify-center rounded-botao text-texto-2"
          >
            <Olho aberto={!mostrar} />
          </button>
        )}
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

/** Olho no traço dos ícones de interface (24 px, 2 px, pontas arredondadas). */
function Olho({ aberto }: { aberto: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <path d="M3 3l18 18" />}
    </svg>
  )
}
