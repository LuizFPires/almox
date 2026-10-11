import { podeLancar, type Perfil } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { BarraInferior, type AbaInferior } from './BarraInferior'
import { Cabecalho } from './Cabecalho'
import { Cartao } from './Cartao'
import { SeloPerfil } from './SeloPerfil'

type Props = {
  titulo: string
  aba: AbaInferior
  /** Quem pode abrir a tela; os demais veem a explicação em `semAcesso`. */
  permitido?: (perfil: Perfil) => boolean
  semAcesso?: string
}

/** Aba da barra inferior que ainda não foi construída. */
export async function TelaEmBreve({ titulo, aba, permitido, semAcesso }: Props) {
  const { obraAtual } = await obterSessao()
  const liberado = permitido ? permitido(obraAtual.perfil) : true

  return (
    <>
      <Cabecalho
        titulo={titulo}
        subtitulo={obraAtual.nome}
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col px-5 pt-2 pb-5">
        <Cartao className="py-6 text-center text-[15px] text-texto-2">
          {liberado ? 'Em breve.' : semAcesso}
        </Cartao>
      </main>
      <BarraInferior ativa={aba} podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
