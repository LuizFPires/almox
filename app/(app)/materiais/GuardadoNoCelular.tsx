import Link from 'next/link'
import type { ReactNode } from 'react'
import { IconeInterface } from '@/components/IconeInterface'
import { TEXTO_GUARDADO } from '@/lib/dominio/offline'

export { TEXTO_GUARDADO }

/**
 * Lançamento de material que ficou na fila do celular (sem sinal). Não há movimento no servidor
 * ainda: só o que foi pedido. Aparece no próprio fluxo (sem internet a página de pronto não abre)
 * e em /materiais/pronto?fila=1.
 */
export function GuardadoNoCelular({
  titulo,
  linha,
  acoes,
}: {
  titulo: string
  /** Ex.: "−100 sc · Cimento". */
  linha?: string
  /** Botões e links do rodapé. */
  acoes: ReactNode
}) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-8 text-center">
        <span
          aria-hidden="true"
          className="flex size-[76px] items-center justify-center rounded-full bg-aviso-claro text-aviso"
        >
          <IconeInterface nome="offline" tamanho={40} />
        </span>
        <h1 className="text-xl font-bold">{titulo}</h1>
        {linha && <p className="text-[15px]">{linha}</p>}
        <p
          role="status"
          className="rounded-xl bg-aviso-claro px-3.5 py-2.5 text-sm font-semibold text-aviso"
        >
          {TEXTO_GUARDADO}
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {acoes}
        <Link
          href="/materiais"
          className="flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-5 text-lg font-bold"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
