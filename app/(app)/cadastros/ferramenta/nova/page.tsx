import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { listarTipos } from '@/lib/dados/ferramentas'
import { obterSessao } from '@/lib/sessao'
import { FormFerramenta } from '../FormFerramenta'

export const metadata: Metadata = { title: 'Nova ferramenta · Almox' }

export default async function PaginaNovaFerramenta() {
  const { obraAtual } = await obterSessao()
  const tipos = await listarTipos(obraAtual.id)
  return (
    <>
      <Cabecalho
        titulo="Nova ferramenta"
        subtitulo={obraAtual.nome}
        voltarPara="/cadastros/ferramentas"
      />
      <NovaVisita>
        <FormFerramenta prefixosUsados={tipos.map((t) => t.prefixo)} />
      </NovaVisita>
    </>
  )
}
