import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { ChaveModo } from '@/components/ChaveModo'
import { listarSaldos } from '@/lib/dados/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { diaDaObra } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'
import { FluxoContagem } from './FluxoContagem'

export const metadata: Metadata = { title: 'Contagem · Almox' }

/** Contagem do fim do dia: o almoxarife digita o que contou e escolhe ajustar ou só conferir. */
export default async function PaginaContagem() {
  const { obraAtual, usuario } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect('/materiais')
  const materiais = await listarSaldos(obraAtual.id)
  const dia = diaDaObra(new Date())

  return (
    <>
      <ChaveModo modo="materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <FluxoContagem obraId={obraAtual.id} usuarioId={usuario.id} dia={dia} materiais={materiais} />
      <BarraInferior modo="materiais" ativa="contagem" podeLancar podeCadastrar={podeCadastrar(obraAtual.perfil)} />
    </>
  )
}
