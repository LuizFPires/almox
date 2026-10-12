import type { Metadata } from 'next'
import Link from 'next/link'
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
      <FormEmpresa
        empresa={empresa}
        pessoas={
          // Encarregado inativado continua na lista: senão salvar a empresa o apagaria.
          empresa.encarregado_pessoa_id &&
          !pessoas.some((p) => p.id === empresa.encarregado_pessoa_id)
            ? [
                ...pessoas,
                {
                  id: empresa.encarregado_pessoa_id,
                  nome: `${empresa.encarregado?.nome ?? 'Encarregado'} (inativo)`,
                },
              ]
            : pessoas
        }
        corSugerida={empresa.cor}
      />
      {pessoas.length > 0 && (
        <div className="px-5 pb-6">
          <Link
            href={`/cadastros/adesivos?empresa=${empresa.id}&volta=${encodeURIComponent(`/cadastros/empresa/${empresa.id}`)}`}
            className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
          >
            Imprimir os {pessoas.length} {pessoas.length === 1 ? 'adesivo' : 'adesivos'} da empresa
          </Link>
        </div>
      )}
    </>
  )
}
