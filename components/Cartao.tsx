import type { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Destaca o cartão com a borda vermelha de pendência. */
  alerta?: boolean
}

export function Cartao({ alerta = false, className = '', ...resto }: Props) {
  return (
    <div
      className={`rounded-cartao bg-cartao px-4 py-3.5 ${alerta ? 'border-[1.5px] border-erro' : ''} ${className}`}
      {...resto}
    />
  )
}
