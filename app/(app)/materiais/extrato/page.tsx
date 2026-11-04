import type { Metadata } from 'next'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { ChaveModo } from '@/components/ChaveModo'
import { extrato, listarSaldos } from '@/lib/dados/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { EditarLancamento } from '../[id]/EditarLancamento'

export const metadata: Metadata = { title: 'Extrato · Almox' }

/** Extrato de todos os materiais: os 100 lançamentos mais recentes. */
export default async function PaginaExtrato() {
  const { obraAtual } = await obterSessao()
  const [linhas, materiais] = await Promise.all([
    extrato(obraAtual.id, undefined, 100),
    listarSaldos(obraAtual.id),
  ])

  return (
    <>
      <header className="px-5 pt-[18px] pb-2">
        <h1 className="text-[22px] leading-tight font-bold">Extrato · todos os materiais</h1>
      </header>
      <ChaveModo modo="materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <main className="flex flex-1 flex-col gap-2 px-5 pt-3.5 pb-5">
        <EditarLancamento
          linhas={linhas}
          materiais={materiais}
          comNome
          podeEditar={podeCadastrar(obraAtual.perfil)}
          vazio="Nada lançado ainda."
        />
      </main>
      <BarraInferior modo="materiais" ativa="extrato" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
