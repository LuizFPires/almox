import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { MenuAparelhos } from '@/components/MenuAparelhos'
import { SeloPerfil } from '@/components/SeloPerfil'
import { indiceCadastros } from '@/lib/dados/busca-cadastros'
import { situacaoImpressao } from '@/lib/dados/impressao'
import { obterSessao } from '@/lib/sessao'
import { BuscaCadastros } from './BuscaCadastros'

/**
 * Moldura das listas de cadastro (opção A + busca geral): cabeçalho com a engrenagem
 * (impressora, TV, planilha, passo a passo), abas, busca em todos os cadastros e barra inferior.
 */
export default async function LayoutListas({ children }: LayoutProps<'/cadastros'>) {
  const { obraAtual } = await obterSessao()
  const [{ impressora, agente }, indice] = await Promise.all([
    situacaoImpressao(obraAtual.id),
    indiceCadastros(obraAtual.id),
  ])
  const pronta = Boolean(impressora) && agente.online
  const situacao = !impressora
    ? 'Nenhuma impressora escolhida'
    : agente.online
      ? `${impressora.nome} · agente online`
      : agente.texto
  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        subtitulo={obraAtual.nome}
        selo={
          <>
            <SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />
            <MenuAparelhos pronta={pronta} situacao={situacao} />
          </>
        }
      />
      <BuscaCadastros indice={indice}>{children}</BuscaCadastros>
      <BarraInferior ativa="cadastros" podeLancar />
    </>
  )
}
