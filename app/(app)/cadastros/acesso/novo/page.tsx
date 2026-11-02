import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { listarEmpresas } from '@/lib/dados/empresas'
import { obterSessao } from '@/lib/sessao'
import { FormNovoAcesso } from '../FormNovoAcesso'

export const metadata: Metadata = { title: 'Dar acesso · Almox' }

export default async function PaginaNovoAcesso({
  searchParams,
}: PageProps<'/cadastros/acesso/novo'>) {
  const [{ obraAtual }, { conta, nome }] = await Promise.all([
    obterSessao(),
    searchParams as Promise<{ conta?: string; nome?: string }>,
  ])
  const empresas = await listarEmpresas(obraAtual.id)
  // Vindo de "Contas aguardando obra": a pessoa já criou o login (e a senha) sozinha.
  const contaExistente = conta ? { email: conta, nome: nome ?? '' } : null
  return (
    <>
      <Cabecalho titulo="Dar acesso" subtitulo={obraAtual.nome} voltarPara="/cadastros/usuarios" />
      <NovaVisita>
        <FormNovoAcesso
          empreiteiras={empresas
            .filter((e) => e.tipo === 'empreiteira')
            .map(({ id, nome }) => ({ id, nome }))}
          contaExistente={contaExistente}
        />
      </NovaVisita>
    </>
  )
}
