import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { buscarEmpresa } from '@/lib/dados/empresas'
import { listarPessoasDaEmpresa } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'
import { FormEmpresa } from '../FormEmpresa'

export const metadata: Metadata = { title: 'Editar empresa · Almox' }

export default async function PaginaEditarEmpresa({
  params,
}: PageProps<'/cadastros/empresa/[id]'>) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const [empresa, pessoas] = await Promise.all([
    buscarEmpresa(obraAtual.id, id),
    listarPessoasDaEmpresa(obraAtual.id, id),
  ])
  if (!empresa) notFound()

  return (
    <>
      <Cabecalho
        titulo={empresa.nome}
        subtitulo="Editar empresa"
        voltarPara="/cadastros/empresas"
      />
      <FormEmpresa empresa={empresa} pessoas={pessoas} corSugerida={empresa.cor} />
    </>
  )
}
