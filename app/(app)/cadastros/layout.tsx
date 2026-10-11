import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { SeloPerfil } from '@/components/SeloPerfil'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

/**
 * Cadastros são só do engenheiro (PRD §5). Os demais perfis veem a explicação; a
 * garantia de verdade está na RLS e nas checagens das Server Actions.
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
      <main className="flex flex-1 flex-col gap-2 px-5 pt-2 pb-5">
        <Cartao className="flex flex-col gap-1.5 py-5">
          <h2 className="text-xl font-bold">Só o engenheiro cadastra</h2>
          <p className="text-[15px] text-texto-2">
            Pessoas, ferramentas, empresas e valores são cadastrados pelo login do engenheiro da
            obra. O almoxarife lança retiradas e devoluções; os demais só consultam.
          </p>
        </Cartao>
      </main>
      <BarraInferior ativa="cadastros" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
