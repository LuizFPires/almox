import { AbasCadastros } from '@/components/AbasCadastros'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { obterSessao } from '@/lib/sessao'

/** Moldura das listas de cadastro: cabeçalho, abas e barra inferior. */
export default async function LayoutListas({ children }: LayoutProps<'/cadastros'>) {
  const { obraAtual } = await obterSessao()
  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        subtitulo={obraAtual.nome}
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <div className="px-5 pt-1 pb-3">
        <AbasCadastros />
      </div>
      <main className="flex flex-1 flex-col gap-2 px-5 pb-6">{children}</main>
      <BarraInferior ativa="cadastros" podeLancar />
    </>
  )
}
