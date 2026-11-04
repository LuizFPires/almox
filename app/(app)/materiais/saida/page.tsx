import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { listarSaldos, maisUsados } from '@/lib/dados/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoLancamento } from '../FluxoLancamento'

export const metadata: Metadata = { title: 'Saída de material · Almox' }

/** Saída: mais usados primeiro; material sem saldo fica desligado. */
export default async function PaginaSaidaMaterial() {
  const { obraAtual, usuario } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect('/materiais')
  // `maisUsados` pode trazer ids de inativos: a ordenação só usa os que estão na lista ativa.
  const [materiais, ordem] = await Promise.all([
    listarSaldos(obraAtual.id),
    maisUsados(obraAtual.id),
  ])

  return (
    <>
      <Cabecalho titulo="Saída · qual material?" voltarPara="/materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <FluxoLancamento
        tipo="saida"
        materiais={materiais}
        ordemMaisUsados={ordem}
        podeCadastrar={podeCadastrar(obraAtual.perfil)}
        quem={usuario.nome}
      />
      <BarraInferior modo="materiais" ativa="inicio-materiais" podeLancar />
    </>
  )
}
