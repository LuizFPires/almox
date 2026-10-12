import Link from 'next/link'
import { AbasCadastros } from '@/components/AbasCadastros'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoImpressora } from '@/components/CartaoImpressora'
import { IconeInterface } from '@/components/IconeInterface'
import { SeloPerfil } from '@/components/SeloPerfil'
import { situacaoImpressao } from '@/lib/dados/impressao'
import { obterSessao } from '@/lib/sessao'

/** Moldura das listas de cadastro: cabeçalho, abas e barra inferior. */
export default async function LayoutListas({ children }: LayoutProps<'/cadastros'>) {
  const { obraAtual } = await obterSessao()
  const { impressora, agente } = await situacaoImpressao(obraAtual.id)
  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        subtitulo={obraAtual.nome}
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <div className="flex flex-col gap-3 px-5 pt-1 pb-3">
        <CartaoImpressora impressora={impressora} agente={agente} href="/cadastros/impressora" />
        <Link
          href="/cadastros/painel-tv"
          className="flex min-h-toque items-center gap-3 rounded-cartao border border-borda bg-cartao px-4 py-3"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sutil"
          >
            <IconeInterface nome="dashboard" tamanho={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-semibold">Painel da TV</span>
            <span className="truncate text-[13px] text-texto-2">Tempo por página e rolagem</span>
          </span>
          <span className="text-sm font-bold underline">Ajustar</span>
        </Link>
        <Link
          href="/cadastros/importar"
          className="flex min-h-toque items-center gap-3 rounded-cartao border border-borda bg-cartao px-4 py-3"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sutil"
          >
            <IconeInterface nome="history" tamanho={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-semibold">Importar planilha</span>
            <span className="truncate text-[13px] text-texto-2">
              Empresas, pessoas e ferramentas de uma vez
            </span>
          </span>
          <span className="text-sm font-bold underline">Abrir</span>
        </Link>
        <AbasCadastros />
      </div>
      <main className="flex flex-1 flex-col gap-2 px-5 pb-6">{children}</main>
      <BarraInferior ativa="cadastros" podeLancar />
    </>
  )
}
