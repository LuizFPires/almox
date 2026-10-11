import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { Indicador } from '@/components/Indicador'
import { Relogio } from '@/components/Relogio'

export const metadata: Metadata = { title: 'Início · Almox' }

const ICONE_LISTA = 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01'
const ICONE_ESTOQUE = 'M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10'
const ICONE_QR =
  'M3 7V3h4 M17 3h4v4 M21 17v4h-4 M7 21H3v-4 M7 7h4v4H7z M13 13h4v4h-4z M13 7h4 M7 15v2'

function Icone({ d, tamanho }: { d: string; tamanho: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const CLASSE_ATALHO =
  'flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-escuro bg-cartao text-base font-bold'

export default function PaginaInicio() {
  return (
    <>
      <header className="flex items-center justify-between px-5 pt-[18px] pb-2">
        <div className="flex flex-col">
          <span className="font-condensada text-[28px] leading-none font-bold tracking-[2px]">
            ALMOX
          </span>
          <span className="text-sm text-texto-2">
            Obra não selecionada · <Relogio formato="dia" />
          </span>
        </div>
        <Link
          href="/lista"
          aria-label="Ver quem está com o quê"
          className="flex size-12 items-center justify-center rounded-[14px] border-[1.5px] border-escuro bg-cartao"
        >
          <Icone d={ICONE_LISTA} tamanho={24} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-5">
        {/* A leitura do QR chega no M4. */}
        <button
          type="button"
          disabled
          className="flex min-h-28 items-center gap-4 rounded-[20px] bg-escuro px-5 text-left text-white"
        >
          <span className="flex size-16 shrink-0 items-center justify-center rounded-cartao bg-amarelo text-texto">
            <Icone d={ICONE_QR} tamanho={36} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[22px] leading-tight font-bold">Ler QR do capacete</span>
            <span className="text-sm opacity-80">Em breve: retirada e devolução</span>
          </span>
        </button>

        <Link href="/lista" className={CLASSE_ATALHO}>
          <Icone d={ICONE_LISTA} tamanho={20} />
          Ver quem está com o quê
        </Link>
        <Link href="/estoque" className={CLASSE_ATALHO}>
          <Icone d={ICONE_ESTOQUE} tamanho={20} />
          Ferramentas na obra · total e livres
        </Link>
        <Link
          href="/lista"
          className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-3 underline"
        >
          Sem capacete ou QR ilegível? Escolher na lista
        </Link>

        <Cartao className="grid grid-cols-4 gap-1.5">
          <Indicador valor={0} rotulo="no canteiro" />
          <Indicador valor={0} rotulo="no almox" />
          <Indicador valor={0} rotulo="manutenção" />
          <Indicador valor={0} rotulo="pendências" tom="erro" />
        </Cartao>

        <section className="flex flex-col gap-2" aria-labelledby="titulo-ultimos">
          <h2 id="titulo-ultimos" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            ÚLTIMOS LANÇAMENTOS
          </h2>
          <Cartao className="py-6 text-center text-[15px] text-texto-2">
            Nenhum lançamento ainda.
          </Cartao>
        </section>
      </main>

      <BarraInferior ativa="inicio" podeLancar />
    </>
  )
}
