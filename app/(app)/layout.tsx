import { Suspense } from 'react'
import { Sincronizador } from '@/components/Sincronizador'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

function Carregando() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center text-texto-2">
      Carregando…
    </div>
  )
}

/** Fila de lançamentos sem internet e dados para lançar offline (M10), em toda tela. */
async function SincronizadorDaSessao() {
  const { obraAtual } = await obterSessao()
  return <Sincronizador obra={obraAtual.id} lanca={podeLancar(obraAtual.perfil)} />
}

/**
 * Moldura das telas do celular: coluna única, largura de telefone mesmo no computador.
 * As páginas leem a sessão (cookies) na hora da requisição, então ficam no Suspense.
 */
export default function LayoutApp({ children }: LayoutProps<'/'>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fundo pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <Suspense fallback={<Carregando />}>{children}</Suspense>
      <Suspense fallback={null}>
        <SincronizadorDaSessao />
      </Suspense>
    </div>
  )
}
