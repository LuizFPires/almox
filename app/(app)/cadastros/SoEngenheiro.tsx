'use client'

import { usePathname } from 'next/navigation'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'

type Props = { podeLancar: boolean }

/**
 * Explicação para quem não é engenheiro. Em /cadastros/materiais* fala de materiais e usa a
 * barra do modo Materiais; nas demais, de ferramentas.
 */
export function SoEngenheiro({ podeLancar }: Props) {
  const caminho = usePathname()
  const materiais = caminho.startsWith('/cadastros/materiais')

  return (
    <>
      <main className="flex flex-1 flex-col gap-2 px-5 pt-2 pb-5">
        <Cartao className="flex flex-col gap-1.5 py-5">
          <h2 className="text-xl font-bold">Só o engenheiro cadastra</h2>
          {materiais ? (
            <p className="text-[15px] text-texto-2">
              Só o engenheiro cadastra materiais e avisos de limite. Para um material novo, use
              “Pedir cadastro” na Entrada.
            </p>
          ) : (
            <p className="text-[15px] text-texto-2">
              Pessoas, ferramentas, empresas e valores são cadastrados pelo login do engenheiro da
              obra. O almoxarife lança retiradas e devoluções; os demais só consultam.
            </p>
          )}
        </Cartao>
      </main>
      {materiais ? (
        <BarraInferior modo="materiais" ativa="cadastros-materiais" podeLancar={podeLancar} />
      ) : (
        <BarraInferior ativa="cadastros" podeLancar={podeLancar} />
      )}
    </>
  )
}
