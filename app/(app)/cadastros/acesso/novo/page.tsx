import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { listarEmpresas } from '@/lib/dados/empresas'
import { obterSessao } from '@/lib/sessao'
import { FormNovoAcesso } from '../FormNovoAcesso'

export const metadata: Metadata = { title: 'Dar acesso · Almox' }

export default async function PaginaNovoAcesso() {
  const { obraAtual } = await obterSessao()
  const empresas = await listarEmpresas(obraAtual.id)
  return (
    <>
      <Cabecalho titulo="Dar acesso" subtitulo={obraAtual.nome} voltarPara="/cadastros/usuarios" />
      <NovaVisita>
        <FormNovoAcesso
          empreiteiras={empresas
            .filter((e) => e.tipo === 'empreiteira')
            .map(({ id, nome }) => ({ id, nome }))}
        />
      </NovaVisita>
    </>
  )
}
