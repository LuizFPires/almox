// Marca do Almox Design System (design-system/marca). O wordmark nunca é substituído
// por texto digitado.

const CAIXA = (
  <>
    <path d="M12 68 122 14 161 33 51 87Z" fill="var(--marca-base)" />
    <path d="M72 98 179 45 226 68 119 121Z" fill="var(--marca-base)" />
    <path d="M8 82 111 133 111 244 8 193Z" fill="var(--marca-base)" />
    <path d="M131 132 234 81 234 192 131 243Z" fill="var(--color-amarelo)" />
  </>
)

const PALAVRA = (
  <g fill="var(--marca-base)">
    <path
      fillRule="evenodd"
      d="M57 48C25 48 5 70 5 102S25 156 56 156C69 156 81 151 89 143V152H123V51H89V60C81 52 70 48 57 48ZM64 78C80 78 89 88 89 102S80 127 64 127 39 117 39 102 49 78 64 78Z"
    />
    <path d="M135 15Q135 12 139 12H165Q169 12 169 16V152H135Z" />
    <path d="M180 152V51H214V63C225 46 254 42 273 64C289 42 323 44 340 62Q354 75 354 98V152H320V103Q320 78 303 78T286 103V152H252V103Q252 78 235 78T214 103V152Z" />
    <path
      fillRule="evenodd"
      d="M419 48C386 48 363 70 363 102S386 156 419 156 475 134 475 102 452 48 419 48ZM419 78C434 78 443 88 443 102S434 127 419 127 395 117 395 102 404 78 419 78Z"
    />
    <path d="M475 51H514L590 152H551L532 126 513 152H473L512 100Z" />
    <path d="M535 71 551 51H590L553 95Z" fill="var(--color-amarelo)" />
  </g>
)

type Props = {
  /** Altura em px; a largura acompanha a proporção da marca. */
  altura: number
  /** `principal` em fundo claro (grafite), `reversa` em fundo escuro (branca). */
  tom?: 'principal' | 'reversa'
  className?: string
}

/** Marca horizontal: caixa + wordmark "almox". */
export function Marca({ altura, tom = 'principal', className }: Props) {
  return (
    <svg
      viewBox="0 0 890 290"
      height={altura}
      width={(altura * 890) / 290}
      role="img"
      aria-label="almox"
      className={className}
      style={{ ['--marca-base' as string]: tom === 'principal' ? '#1F2937' : '#FFFFFF' }}
    >
      <g transform="translate(10 14)">{CAIXA}</g>
      <g transform="translate(278 43)">{PALAVRA}</g>
    </svg>
  )
}
