import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { ErroFormulario } from '@/components/Formulario'
import { listarEmpresas } from '@/lib/dados/empresas'
import { buscarPessoa, listarPessoas } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'
import { alternarAtiva } from '../acoes'
import { FormPessoa } from '../FormPessoa'

export const metadata: Metadata = { title: 'Editar pessoa · Almox' }

export default async function PaginaEditarPessoa({
  params,
  searchParams,
}: PageProps<'/cadastros/pessoa/[id]'>) {
  const { id } = await params
  const { erro } = (await searchParams) as { erro?: string }
  const { obraAtual } = await obterSessao()
  const [pessoa, empresas, pessoas] = await Promise.all([
    buscarPessoa(obraAtual.id, id),
    listarEmpresas(obraAtual.id),
    listarPessoas(obraAtual.id),
  ])
  if (!pessoa) notFound()
  const itens = pessoa.posses.length

  return (
    <>
      <Cabecalho
        titulo={pessoa.nome}
        subtitulo={`${pessoa.matricula}${pessoa.ativa ? '' : ' · inativa'}`}
        voltarPara="/cadastros/pessoas"
      />
      <FormPessoa
        pessoa={{
          id: pessoa.id,
          nome: pessoa.nome,
          nome_capacete: pessoa.nome_capacete,
          funcao: pessoa.funcao,
          empresa_id: pessoa.empresa?.id ?? '',
        }}
        empresas={empresas.map(({ id: idEmpresa, nome, cor }) => ({ id: idEmpresa, nome, cor }))}
        capacetesUsados={pessoas
          .filter((p) => p.ativa && p.id !== pessoa.id)
          .map((p) => p.nome_capacete)}
      />
      <form action={alternarAtiva} className="px-5 pb-6">
        {erro === 'situacao' && (
          <div className="mb-2">
            <ErroFormulario mensagem="Não foi possível alterar a situação. Tente de novo." />
          </div>
        )}
        <input type="hidden" name="id" value={pessoa.id} />
        <input type="hidden" name="ativa" value={String(!pessoa.ativa)} />
        {pessoa.ativa && itens > 0 && (
          <p className="mb-2 text-sm text-aviso">
            Está com {itens} {itens === 1 ? 'item' : 'itens'}. Inativar não devolve nada: a
            ferramenta continua no nome dela até a devolução.
          </p>
        )}
        <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
          {pessoa.ativa ? 'Inativar pessoa' : 'Reativar pessoa'}
        </Botao>
      </form>
    </>
  )
}
