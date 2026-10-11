import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  titulo: string
  subtitulo?: string
  /** Destino do botão Voltar; sem ele, o botão não aparece. */
  voltarPara?: string
  /** Voltar como ação na mesma tela (ex.: da conferência para a leitura); usa no lugar do link. */
  aoVoltar?: () => void
  /** Selo à direita (ex.: perfil, "SEM QR"). */
  selo?: ReactNode
}

const SETA = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export function Cabecalho({ titulo, subtitulo, voltarPara, aoVoltar, selo }: Props) {
  return (
    <header className="flex items-center gap-2 px-4 pt-4 pb-2">
      {aoVoltar ? (
        <button
          type="button"
          onClick={aoVoltar}
          aria-label="Voltar"
          className="flex size-toque items-center justify-center rounded-full"
        >
          {SETA}
        </button>
      ) : (
        voltarPara && (
          <Link
            href={voltarPara}
            aria-label="Voltar"
            className="flex size-toque items-center justify-center rounded-full"
          >
            {SETA}
          </Link>
        )
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-[22px] leading-tight font-bold">{titulo}</h1>
        {subtitulo && <span className="text-[13px] text-texto-2">{subtitulo}</span>}
      </div>
      {selo}
    </header>
  )
}
