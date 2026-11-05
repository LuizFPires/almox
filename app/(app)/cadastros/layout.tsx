import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { SoEngenheiro } from './SoEngenheiro'

/**
 * Cadastros são só do engenheiro (PRD §5). Os demais perfis veem a explicação (de ferramentas
 * ou de materiais, conforme o caminho); a garantia de verdade está na RLS e nas checagens das
 * Server Actions.
 */
export default async function LayoutCadastros({ children }: LayoutProps<'/cadastros'>) {
  const { obraAtual } = await obterSessao()
  if (podeCadastrar(obraAtual.perfil)) return children

  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        subtitulo={obraAtual.nome}
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <SoEngenheiro podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
