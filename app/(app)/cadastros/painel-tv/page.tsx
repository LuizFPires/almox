import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { configDaObra } from '@/lib/dados/config-tv'
import { obterSessao } from '@/lib/sessao'
import { FormPainelTv } from './FormPainelTv'

export const metadata: Metadata = { title: 'Painel da TV · Almox' }

/** Configuração do painel da TV da obra (PRD F-13; só o engenheiro, pelo layout de Cadastros). */
export default async function PaginaPainelTv() {
  const { obraAtual } = await obterSessao()
  const config = await configDaObra(obraAtual.id)
  return (
    <>
      <Cabecalho titulo="Painel da TV" subtitulo={obraAtual.nome} voltarPara="/cadastros/pessoas" />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
        <p className="rounded-cartao bg-engenheiro-claro px-4 py-3 text-[15px] text-engenheiro">
          A TV mostra páginas de cartões por pessoa e depois as colunas por empresa rolando, em
          loop. Para conectar uma TV, cadastre o mini PC em Cadastros › Impressora e abra o endereço
          do painel nele.
        </p>
        <Cartao>
          <FormPainelTv config={config} />
        </Cartao>
      </main>
    </>
  )
}
