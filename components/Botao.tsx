import type { ButtonHTMLAttributes } from 'react'

const VARIANTES = {
  primaria: 'bg-amarelo text-texto hover:bg-amarelo-hover',
  escura: 'bg-escuro text-white',
  engenheiro: 'bg-engenheiro text-white',
  sucesso: 'bg-sucesso text-white',
  perigo: 'bg-erro text-white',
  secundaria: 'bg-cartao text-texto border border-borda',
} as const

const TAMANHOS = {
  m: 'min-h-toque px-4 text-[15px] rounded-botao',
  g: 'min-h-14 px-5 text-lg rounded-cartao',
} as const

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof VARIANTES
  tamanho?: keyof typeof TAMANHOS
  larguraTotal?: boolean
}

/** Botão de verdade, com alvo de toque de no mínimo 44 px. */
export function Botao({
  variante = 'primaria',
  tamanho = 'm',
  larguraTotal = false,
  type = 'button',
  className = '',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={`${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${larguraTotal ? 'w-full' : ''} inline-flex items-center justify-center gap-2 font-bold disabled:opacity-40 ${className}`}
      {...resto}
    />
  )
}
