import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense, type ReactNode } from 'react'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { COOKIE_TV, lerPainel } from '@/lib/dados/tv'
import { PainelTv } from './PainelTv'
import { TentarDeNovo } from './TentarDeNovo'

export const metadata: Metadata = { title: 'Painel · Almox' }

/** Painel da TV (F-13): entra pela credencial da TV guardada em cookie (sem login). */
export default function PaginaTv({ searchParams }: PageProps<'/tv'>) {
  return (
    <Suspense fallback={<Moldura obra="">Carregando…</Moldura>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  )
}

async function Conteudo({ searchParams }: Pick<PageProps<'/tv'>, 'searchParams'>) {
  const { codigo } = (await searchParams) as { codigo?: string }
  const token = (await cookies()).get(COOKIE_TV)?.value
  const resultado = await lerPainel(token)
  if (resultado.tipo === 'nao_autorizado') {
    return (
      <Moldura obra="">
        {/* Se foi uma falha passageira, a TV volta sozinha. */}
        <TentarDeNovo emMs={5 * 60_000} />
        <span className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl font-bold text-tv-texto">
            {codigo === 'invalido' ? 'Código vencido ou já usado' : 'Dispositivo não autorizado'}
          </span>
          <span className="max-w-[900px] text-2xl">
            Em Cadastros › Impressora, o engenheiro toca em “Conectar uma TV” no mini PC e abre o
            endereço que aparece neste navegador. O código vale 10 minutos e uma vez.
          </span>
        </span>
      </Moldura>
    )
  }
  // Sem versão na primeira carga, o painel vem sempre completo ('igual' não acontece aqui).
  if (resultado.tipo !== 'ok') {
    return (
      <Moldura obra="">
        <TentarDeNovo />
        Sem conexão com o servidor. Tentando de novo…
      </Moldura>
    )
  }
  return <PainelTv inicial={resultado.painel} />
}

function Moldura({ obra, children }: { obra: string; children: ReactNode }) {
  return (
    <div
      data-testid="painel-tv"
      className="flex h-dvh flex-col gap-4 overflow-hidden bg-tv-fundo px-10 py-7 text-tv-texto"
    >
      <header className="flex h-16 items-center gap-7">
        <div className="flex items-center gap-5">
          <Marca altura={52} tom="reversa" />
          <span className="text-xl text-tv-texto-2">{obra}</span>
        </div>
        <div className="flex flex-1 justify-center">
          <span className="text-[32px] font-bold tracking-tight">QUEM ESTÁ COM O QUÊ</span>
        </div>
        <Relogio
          formato="hora"
          className="min-w-[130px] text-right text-[48px] leading-none font-bold tracking-tight tabular-nums"
        />
      </header>
      <main className="flex flex-1 items-center justify-center rounded-cartao bg-tv-cartao text-3xl text-tv-texto-2">
        {children}
      </main>
      <div className="h-2 rounded bg-tv-chip" />
    </div>
  )
}
