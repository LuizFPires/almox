'use client'

import Link from 'next/link'

/** Falha inesperada numa tela do celular (ex.: sem internet no canteiro). */
export default function ErroApp({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-[15px] text-texto-2">
        Pode ser a internet da obra. Nada foi lançado por causa deste erro.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-14 w-full rounded-cartao bg-escuro px-5 text-lg font-bold text-white"
      >
        Tentar de novo
      </button>
      <Link href="/inicio" className="min-h-toque text-sm font-semibold underline">
        Voltar ao início
      </Link>
    </main>
  )
}
