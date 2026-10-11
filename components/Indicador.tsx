type Props = {
  valor: number
  rotulo: string
  tom?: 'normal' | 'erro'
}

/** Número grande + rótulo, como no resumo da tela inicial. */
export function Indicador({ valor, rotulo, tom = 'normal' }: Props) {
  return (
    <div className="flex flex-col">
      <span
        className={`font-condensada text-[32px] leading-none font-bold ${tom === 'erro' ? 'text-erro' : ''}`}
      >
        {valor}
      </span>
      <span className="text-[13px] text-texto-2">{rotulo}</span>
    </div>
  )
}
