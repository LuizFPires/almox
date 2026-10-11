import type { Metadata } from 'next'
import { Relogio } from '@/components/Relogio'

export const metadata: Metadata = { title: 'Painel · Almox' }

/** Esqueleto do painel da TV (M8 traz o loop de cartões e colunas). */
export default function PaginaTv() {
  return (
    <div
      data-testid="painel-tv"
      className="flex h-dvh flex-col gap-4 overflow-hidden bg-tv-fundo px-10 py-7 text-tv-texto"
    >
      <header className="flex h-16 items-center gap-7">
        <div className="flex items-baseline gap-4">
          <span className="font-condensada text-[44px] leading-none font-bold tracking-[3px] text-amarelo">
            ALMOX
          </span>
          <span className="text-xl text-tv-texto-2">Obra não selecionada</span>
        </div>
        <div className="flex flex-1 justify-center">
          <span className="font-condensada text-[34px] font-bold tracking-[1.5px]">
            QUEM ESTÁ COM O QUÊ
          </span>
        </div>
        <Relogio
          formato="hora"
          className="min-w-[130px] text-right font-condensada text-[52px] leading-none font-bold"
        />
      </header>
      <main className="flex flex-1 items-center justify-center rounded-bloco bg-tv-cartao">
        <p className="text-3xl text-tv-texto-2">Aguardando dados do almoxarifado</p>
      </main>
      <div className="h-2 rounded bg-tv-chip" />
    </div>
  )
}
