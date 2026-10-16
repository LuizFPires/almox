import { Suspense } from 'react'

function Carregando() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center text-texto-2">
      Carregando…
    </div>
  )
}

/**
 * Administração: mesma moldura do app, mas fora das telas da obra (não exige obra ativa nem
 * sincroniza lançamentos).
 */
export default function LayoutAdministracao({ children }: LayoutProps<'/administracao'>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fundo pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <Suspense fallback={<Carregando />}>{children}</Suspense>
    </div>
  )
}
