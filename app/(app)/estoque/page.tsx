import type { Metadata } from 'next'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { dadosEstoque } from '@/lib/dados/lista'
import { resumirEstoque } from '@/lib/dominio/estoque'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { TiposEstoque } from './TiposEstoque'

export const metadata: Metadata = { title: 'Estoque · Almox' }

const LEGENDA = [
  { cor: 'bg-sucesso', rotulo: 'livre' },
  { cor: 'bg-amarelo', rotulo: 'no canteiro' },
  { cor: 'bg-erro', rotulo: 'manutenção' },
]

/** Ferramentas na obra (F-09): totais da obra; nomes só do que a RLS deixa ver. */
export default async function PaginaEstoque() {
  const { obraAtual } = await obterSessao()
  const agora = new Date()
  const { tipos, posses } = await dadosEstoque(obraAtual.id)
  const { totais, tipos: resumos } = resumirEstoque(tipos, posses, agora)

  return (
    <>
      <AoVivo obraId={obraAtual.id} tabelas={['movimento', 'unidade']} />
      <Cabecalho
        titulo="Ferramentas na obra"
        subtitulo="Total e livres · agora"
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <dl className="grid grid-cols-4 gap-2 rounded-cartao bg-cartao px-4 py-3.5">
          {[
            { valor: totais.total, rotulo: 'na obra', cor: '' },
            { valor: totais.livres, rotulo: 'livres', cor: 'text-sucesso' },
            { valor: totais.noCanteiro, rotulo: 'no canteiro', cor: 'text-aviso' },
            { valor: totais.manutencao, rotulo: 'manutenção', cor: 'text-erro' },
          ].map((x) => (
            <div key={x.rotulo} className="flex flex-col-reverse">
              <dt className="text-[12px] text-texto-2">{x.rotulo}</dt>
              <dd
                className={`text-[30px] leading-none font-bold tracking-tight tabular-nums ${x.cor}`}
              >
                {x.valor}
              </dd>
            </div>
          ))}
        </dl>
        <ul aria-label="Legenda" className="flex gap-4 text-[13px] text-texto-2">
          {LEGENDA.map((l) => (
            <li key={l.rotulo} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-3 rounded-[3px] ${l.cor}`} />
              {l.rotulo}
            </li>
          ))}
        </ul>
        <TiposEstoque tipos={resumos} agora={agora.toISOString()} />
      </main>
      <BarraInferior ativa="estoque" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
