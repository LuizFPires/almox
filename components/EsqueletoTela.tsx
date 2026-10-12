/**
 * Tela "carregando" das rotas sem barra inferior (loading.tsx): o toque abre isto na hora
 * (o Next pré-carrega até aqui) e o conteúdo entra em seguida.
 */
export function EsqueletoTela({ titulo }: { titulo: string }) {
  return (
    <div role="status" aria-label={`Carregando ${titulo}`} className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="size-toque shrink-0" />
        <span className="text-[22px] leading-tight font-bold">{titulo}</span>
      </header>
      <div className="flex flex-col gap-3 px-5 pt-2" aria-hidden="true">
        <span className="h-20 animate-pulse rounded-cartao bg-sutil" />
        <span className="h-14 animate-pulse rounded-cartao bg-sutil" />
        <span className="h-14 animate-pulse rounded-cartao bg-sutil" />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  )
}
