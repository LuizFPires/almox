import type { Metadata } from 'next'
import Link from 'next/link'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { Cartao } from '@/components/Cartao'
import { listarEmpresas } from '@/lib/dados/empresas'
import { listarPessoas } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'
import { FormPessoa } from '../FormPessoa'

export const metadata: Metadata = { title: 'Nova pessoa · Almox' }

export default async function PaginaNovaPessoa() {
  const { obraAtual } = await obterSessao()
  const [empresas, pessoas] = await Promise.all([
    listarEmpresas(obraAtual.id),
    listarPessoas(obraAtual.id),
  ])

  return (
    <>
      <Cabecalho titulo="Nova pessoa" subtitulo={obraAtual.nome} voltarPara="/cadastros/pessoas" />
      {empresas.length === 0 ? (
        <main className="px-5 pt-2">
          <Cartao className="flex flex-col gap-3 py-5">
            <p>Antes de cadastrar pessoas, cadastre a empresa delas.</p>
            <Link href="/cadastros/empresa/nova" className="font-semibold underline">
              Cadastrar empresa
            </Link>
          </Cartao>
        </main>
      ) : (
        <NovaVisita>
          <FormPessoa
            empresas={empresas.map(({ id, nome, cor }) => ({ id, nome, cor }))}
            capacetesUsados={pessoas.filter((p) => p.ativa).map((p) => p.nome_capacete)}
          />
        </NovaVisita>
      )}
    </>
  )
}
