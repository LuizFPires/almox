import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { listarSaldos } from '@/lib/dados/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoLancamento } from '../FluxoLancamento'

export const metadata: Metadata = { title: 'Entrada de material · Almox' }

/** Entrada: escolhe o material, digita a quantidade e confere. */
export default async function PaginaEntradaMaterial() {
  const { obraAtual, usuario } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect('/materiais')
  const materiais = await listarSaldos(obraAtual.id)

  return (
    <>
      <Cabecalho titulo="Entrada · qual material?" voltarPara="/materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <FluxoLancamento
        tipo="entrada"
        materiais={materiais}
        ordemMaisUsados={[]}
        podeCadastrar={podeCadastrar(obraAtual.perfil)}
        quem={usuario.nome}
        obraId={obraAtual.id}
        usuarioId={usuario.id}
      />
      <BarraInferior
        modo="materiais"
        ativa="inicio-materiais"
        podeLancar
        podeCadastrar={podeCadastrar(obraAtual.perfil)}
      />
    </>
  )
}
