import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { listarEmpresas } from '@/lib/dados/empresas'
import { proximaCor } from '@/lib/dominio/cadastros'
import { obterSessao } from '@/lib/sessao'
import { FormEmpresa } from '../FormEmpresa'

export const metadata: Metadata = { title: 'Nova empresa · Almox' }

export default async function PaginaNovaEmpresa() {
  const { obraAtual } = await obterSessao()
  const empresas = await listarEmpresas(obraAtual.id)
  return (
    <>
      <Cabecalho
        titulo="Nova empresa"
        subtitulo={obraAtual.nome}
        voltarPara="/cadastros/empresas"
      />
      <FormEmpresa pessoas={[]} corSugerida={proximaCor(empresas.map((e) => e.cor))} />
    </>
  )
}
