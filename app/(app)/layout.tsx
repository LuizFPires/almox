/** Moldura das telas do celular: coluna única, largura de telefone mesmo no computador. */
export default function LayoutApp({ children }: LayoutProps<'/'>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fundo pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      {children}
    </div>
  )
}
