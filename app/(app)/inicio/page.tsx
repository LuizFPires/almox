import type { Metadata } from 'next'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { Indicador } from '@/components/Indicador'
import { Relogio } from '@/components/Relogio'

export const metadata: Metadata = { title: 'Início · Almox' }

function AtalhoLancamento({ tipo }: { tipo: 'retirada' | 'devolucao' }) {
  const retirada = tipo === 'retirada'
  return (
    <button
      type="button"
      disabled
      className={`flex min-h-[120px] flex-col justify-between gap-5 rounded-bloco px-4 py-[18px] text-left disabled:opacity-100 ${
        retirada ? 'bg-amarelo text-texto' : 'bg-escuro text-white'
      }`}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={retirada ? 'M12 19V5 M5 12l7-7 7 7' : 'M12 5v14 M5 12l7 7 7-7'} />
      </svg>
      <span className="flex flex-col">
        <span className="text-[22px] leading-tight font-bold">
          {retirada ? 'Retirada' : 'Devolução'}
        </span>
        <span className="text-[13px] opacity-75">Em breve</span>
      </span>
    </button>
  )
}

export default function PaginaInicio() {
  return (
    <>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex flex-col">
          <span className="font-condensada text-[28px] leading-none font-bold tracking-[2px]">
            ALMOX
          </span>
          <span className="text-sm text-texto-2">
            Obra não selecionada · <Relogio formato="dia" />
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pt-1 pb-5">
        <div className="grid grid-cols-2 gap-3">
          <AtalhoLancamento tipo="retirada" />
          <AtalhoLancamento tipo="devolucao" />
        </div>

        <Cartao className="grid grid-cols-3 gap-2">
          <Indicador valor={0} rotulo="no canteiro" />
          <Indicador valor={0} rotulo="no almox" />
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
