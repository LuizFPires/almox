import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { IconeInterface } from '@/components/IconeInterface'
import { Indicador } from '@/components/Indicador'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { SeloPerfil } from '@/components/SeloPerfil'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Início · Almox' }

const CLASSE_ATALHO =
  'flex h-[52px] items-center justify-center gap-2.5 rounded-botao border border-borda bg-cartao text-base font-bold'

export default async function PaginaInicio() {
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-2">
        <div className="flex min-w-0 flex-col">
          <h1>
            <Marca altura={34} />
          </h1>
          <span className="truncate text-sm text-texto-2">
            {obraAtual.nome} · <Relogio formato="dia" />
          </span>
        </div>
        <SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-5">
        {!lanca && (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm leading-snug">
            <b>Perfil de consulta.</b> Você vê quem está com o quê. Retirada e devolução só pelo
            login do almoxarife ou do engenheiro.
          </p>
        )}

        {/* A leitura do QR chega no M4. */}
        <button
          type="button"
          disabled
          className={`flex min-h-28 items-center gap-4 rounded-cartao px-5 text-left ${
            lanca ? 'bg-escuro text-white' : 'border border-borda bg-cartao text-texto'
          }`}
        >
          <span
            className={`flex size-16 shrink-0 items-center justify-center rounded-botao text-texto ${
              lanca ? 'bg-amarelo' : 'bg-sutil'
            }`}
          >
            <IconeInterface nome="qr-code" tamanho={36} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[22px] leading-tight font-bold">Ler QR do capacete</span>
            <span className="text-sm opacity-80">
              {lanca ? 'Em breve: retirada e devolução' : 'Em breve: ver o que está com a pessoa'}
            </span>
          </span>
        </button>

        <Link href="/lista" className={CLASSE_ATALHO}>
          <IconeInterface nome="users" tamanho={20} />
          Ver quem está com o quê
        </Link>
        <Link href="/estoque" className={CLASSE_ATALHO}>
          <IconeInterface nome="box" tamanho={20} />
          Ferramentas na obra · total e livres
        </Link>
        {lanca && (
          <Link
            href="/lista"
            className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-3 underline"
          >
            Sem capacete ou QR ilegível? Escolher na lista
          </Link>
        )}

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

      <BarraInferior ativa="inicio" podeLancar={lanca} />
    </>
  )
}
