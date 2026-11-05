import type { Metadata } from 'next'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { ChaveModo } from '@/components/ChaveModo'
import { extratoPeriodo, listarSaldos, resumoPeriodo } from '@/lib/dados/materiais'
import { lerFiltroExtrato, passaNoTipo } from '@/lib/dominio/extrato'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { diaDaObra } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'
import { FiltrosExtrato } from './FiltrosExtrato'
import { LinhaDoTempo } from './LinhaDoTempo'
import { ResumoExtrato } from './ResumoExtrato'

export const metadata: Metadata = { title: 'Extrato · Almox' }

/** Extrato de materiais por período: filtros, resumo recolhível e linha do tempo por dia. */
export default async function PaginaExtrato({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { obraAtual } = await obterSessao()
  const hoje = diaDaObra(new Date())
  const filtro = lerFiltroExtrato(await searchParams, hoje)
  const [{ linhas, cortado }, resumo, materiais] = await Promise.all([
    extratoPeriodo(obraAtual.id, filtro.de, filtro.ate, filtro.material),
    resumoPeriodo(obraAtual.id, filtro.de, filtro.ate),
    listarSaldos(obraAtual.id),
  ])
  const visiveis = linhas.filter((l) => passaNoTipo(l.tipo, filtro.tipo))
  // Material do filtro: dos ativos ou, se inativo, do próprio resumo.
  const doFiltro = filtro.material
    ? (materiais.find((m) => m.id === filtro.material) ??
      resumo.find((r) => r.materialId === filtro.material))
    : undefined
  const material =
    filtro.material && doFiltro
      ? { id: filtro.material, nome: doFiltro.nome, unidade: doFiltro.unidade }
      : null
  const opcoes = materiais.map((m) => ({ id: m.id, nome: m.nome }))
  // Inativo escolhido pela URL continua aparecendo no seletor.
  if (material && !opcoes.some((m) => m.id === material.id)) {
    opcoes.push({ id: material.id, nome: material.nome })
  }

  return (
    <>
      <header className="px-5 pt-[18px] pb-2">
        <h1 className="text-[22px] leading-tight font-bold">Extrato</h1>
      </header>
      <ChaveModo modo="materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <FiltrosExtrato filtro={filtro} hoje={hoje} materiais={opcoes} />
      <ResumoExtrato
        resumo={filtro.material ? resumo.filter((r) => r.materialId === filtro.material) : resumo}
        material={material}
        de={filtro.de}
        ate={filtro.ate}
      />
      <main className="flex flex-1 flex-col px-5 pt-1 pb-6">
        <LinhaDoTempo
          linhas={visiveis}
          materiais={materiais}
          hoje={hoje}
          podeEditar={podeCadastrar(obraAtual.perfil)}
          cortado={cortado}
        />
      </main>
      <BarraInferior
        modo="materiais"
        ativa="extrato"
        podeLancar={podeLancar(obraAtual.perfil)}
        podeCadastrar={podeCadastrar(obraAtual.perfil)}
      />
    </>
  )
}
