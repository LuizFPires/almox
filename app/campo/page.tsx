import type { Metadata } from 'next'
import { FluxoCampo } from './FluxoCampo'

export const metadata: Metadata = { title: 'Lançar sem internet · Almox' }

/**
 * Lançar sem internet (M10). Página estática (não lê a sessão no servidor): o service worker
 * guarda esta tela e ela funciona só com o que o celular guardou (IndexedDB). Os lançamentos
 * ficam na fila e vão para o servidor quando a rede volta, onde as regras valem de novo.
 */
export default function PaginaCampo() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fundo pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <FluxoCampo />
    </div>
  )
}
