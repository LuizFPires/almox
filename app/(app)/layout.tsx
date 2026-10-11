import { Suspense } from 'react'

function Carregando() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center text-texto-2">
      Carregando…
    </div>
  )
}

/**
 * Moldura das telas do celular: coluna única, largura de telefone mesmo no computador.
 * As páginas leem a sessão (cookies) na hora da requisição, então ficam no Suspense.
 */
export default function LayoutApp({ children }: LayoutProps<'/'>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fundo pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <Suspense fallback={<Carregando />}>{children}</Suspense>
    </div>
  )
}
