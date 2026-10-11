type Props = {
  valor: number
  onChange: (valor: number) => void
  /** Item contado, usado nos aria-labels ("Diminuir Pá"). */
  rotulo: string
  minimo?: number
  maximo: number
}

const CLASSE_BOTAO =
  'size-toque rounded-botao border border-borda bg-cartao text-[22px] font-bold disabled:opacity-40'

/** Contador de quantidade (− valor +), limitado entre mínimo e máximo. */
export function Contador({ valor, onChange, rotulo, minimo = 0, maximo }: Props) {
  const mudar = (novo: number) => onChange(Math.min(maximo, Math.max(minimo, novo)))
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={CLASSE_BOTAO}
        aria-label={`Diminuir ${rotulo}`}
        disabled={valor <= minimo}
        onClick={() => mudar(valor - 1)}
      >
        −
      </button>
      <span
        className="min-w-8 text-center text-[28px] leading-none font-bold tabular-nums"
        aria-live="polite"
      >
        {valor}
      </span>
      <button
        type="button"
        className={CLASSE_BOTAO}
        aria-label={`Aumentar ${rotulo}`}
        disabled={valor >= maximo}
        onClick={() => mudar(valor + 1)}
      >
        +
      </button>
    </div>
  )
}
