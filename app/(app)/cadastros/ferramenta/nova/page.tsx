import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { iconesProprios, listarLocadoras, listarTiposResumo } from '@/lib/dados/ferramentas'
import { obterSessao } from '@/lib/sessao'
import { FormFerramenta } from '../FormFerramenta'

export const metadata: Metadata = { title: 'Nova ferramenta · Almox' }

export default async function PaginaNovaFerramenta() {
  const { obraAtual } = await obterSessao()
  const tipos = await listarTiposResumo(obraAtual.id)
  const locadoras = await listarLocadoras(obraAtual.id, tipos)
  return (
    <>
      <Cabecalho
        titulo="Nova ferramenta"
        subtitulo={obraAtual.nome}
        voltarPara="/cadastros/ferramentas"
      />
      <NovaVisita>
        <FormFerramenta
          chave={crypto.randomUUID()}
          obraId={obraAtual.id}
          prefixosUsados={tipos.map((t) => t.prefixo)}
          iconesProprios={iconesProprios(tipos)}
          locadoras={locadoras}
        />
      </NovaVisita>
    </>
  )
}
