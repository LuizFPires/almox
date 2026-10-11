import type { Metadata } from 'next'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { listarEmpresas } from '@/lib/dados/empresas'
import { pessoasComItens } from '@/lib/dados/lista'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { ListaQuemEsta } from './ListaQuemEsta'

export const metadata: Metadata = { title: 'Quem está com o quê · Almox' }

/** Lista "quem está com o quê" (F-07). A RLS limita a consulta de empreiteira à empresa dela. */
export default async function PaginaLista() {
  const { obraAtual } = await obterSessao()
  const [pessoas, empresas] = await Promise.all([
    pessoasComItens(obraAtual.id),
    listarEmpresas(obraAtual.id),
  ])
  const comPessoas = new Set(pessoas.map((p) => p.empresa.id))

  return (
    <>
      <AoVivo obraId={obraAtual.id} tabelas={['movimento']} />
      <Cabecalho
        titulo="Quem está com o quê"
        subtitulo={obraAtual.empresa ? `${obraAtual.empresa.nome} · agora` : 'Todas as empresas · agora'}
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <ListaQuemEsta
          pessoas={pessoas}
          empresas={empresas
            .filter((e) => comPessoas.has(e.id))
            .map((e) => ({ id: e.id, nome: e.nome, cor: e.cor }))}
          agora={new Date().toISOString()}
        />
      </main>
      <BarraInferior ativa="lista" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
