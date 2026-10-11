'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { imprimirAdesivo } from '../../acoes'

type Props = {
  pessoaId: string
  volta: string
  /** Sem impressora escolhida: o botão leva à tela Impressora (como no protótipo). */
  escolherImpressora: string | null
}

/** Cópias (1 a 5) e o botão "Imprimir N etiquetas" da tela Imprimir. */
export function FormImprimir({ pessoaId, volta, escolherImpressora }: Props) {
  const [estado, acao, enviando] = useActionState(imprimirAdesivo, {})
  const [copias, setCopias] = useState(estado.copias ?? 1)

  return (
    <form action={acao} className="flex flex-col">
      <input type="hidden" name="id" value={pessoaId} />
      <input type="hidden" name="volta" value={volta} />
      <input type="hidden" name="copias" value={copias} />
      <div className="mx-5 mb-4 flex items-center gap-3 rounded-cartao bg-cartao px-4 py-3">
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">Cópias</span>
          <span className="text-[13px] text-texto-2">Uma reserva ajuda se descolar</span>
        </span>
        <button
          type="button"
          aria-label="Menos cópias"
          disabled={copias <= 1}
          onClick={() => setCopias((c) => Math.max(1, c - 1))}
          className="size-toque rounded-botao border border-borda text-xl font-bold disabled:opacity-30"
        >
          −
        </button>
        <output aria-live="polite" className="w-6 text-center text-lg font-bold">
          {copias}
        </output>
        <button
          type="button"
          aria-label="Mais cópias"
          disabled={copias >= 5}
          onClick={() => setCopias((c) => Math.min(5, c + 1))}
          className="size-toque rounded-botao border border-borda text-xl font-bold disabled:opacity-30"
        >
          +
        </button>
      </div>
      {estado.erro && (
        <div className="mx-5 mb-4">
          <ErroFormulario mensagem={estado.erro} />
        </div>
      )}
      <RodapeAcao>
        {escolherImpressora ? (
          <Link
            href={escolherImpressora}
            className="flex min-h-14 items-center justify-center rounded-cartao bg-engenheiro px-5 text-lg font-bold text-white"
          >
            Escolher impressora
          </Link>
        ) : (
          <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={enviando}>
            {enviando
              ? 'Enviando para a impressora…'
              : `Imprimir ${copias} ${copias === 1 ? 'etiqueta' : 'etiquetas'}`}
          </Botao>
        )}
      </RodapeAcao>
    </form>
  )
}
