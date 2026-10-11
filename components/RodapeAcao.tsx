import type { ReactNode } from 'react'

type Props = {
  /** Resumo acima do botão (ex.: "3 itens"). */
  resumo?: ReactNode
  /** O botão de ação principal. */
  children: ReactNode
}

/** Rodapé das telas de lançamento: resumo + botão grande. */
export function RodapeAcao({ resumo, children }: Props) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-borda bg-cartao px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {resumo && <div className="text-right font-bold">{resumo}</div>}
      {children}
    </div>
  )
}
