import { BarraInferior, type AbaInferior } from './BarraInferior'
import { Cabecalho } from './Cabecalho'
import { Cartao } from './Cartao'

type Props = {
  titulo: string
  aba: AbaInferior
}

/** Aba da barra inferior que ainda não foi construída. */
export function TelaEmBreve({ titulo, aba }: Props) {
  return (
    <>
      <Cabecalho titulo={titulo} />
      <main className="flex flex-1 flex-col px-5 pt-2 pb-5">
        <Cartao className="py-6 text-center text-[15px] text-texto-2">Em breve.</Cartao>
      </main>
      <BarraInferior ativa={aba} podeLancar />
    </>
  )
}
