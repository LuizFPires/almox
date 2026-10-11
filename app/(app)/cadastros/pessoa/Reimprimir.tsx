'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { reimprimirAdesivo } from './acoes'

/** "Reimprimir" com 1 a 5 cópias (capacete novo, adesivo gasto…). */
export function Reimprimir({ pessoaId }: { pessoaId: string }) {
  const [estado, acao, enviando] = useActionState(reimprimirAdesivo, {})
  const [copias, setCopias] = useState(1)

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={pessoaId} />
      <input type="hidden" name="copias" value={copias} />
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-botao border border-borda bg-cartao">
          <button
            type="button"
            aria-label="Menos uma cópia"
            disabled={copias <= 1}
            onClick={() => setCopias((c) => Math.max(1, c - 1))}
            className="size-toque text-xl font-bold disabled:opacity-30"
          >
            −
          </button>
          <output aria-live="polite" className="w-16 text-center font-semibold">
            {copias} {copias === 1 ? 'cópia' : 'cópias'}
          </output>
          <button
            type="button"
            aria-label="Mais uma cópia"
            disabled={copias >= 5}
            onClick={() => setCopias((c) => Math.min(5, c + 1))}
            className="size-toque text-xl font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
        <Botao type="submit" variante="escura" className="flex-1" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Reimprimir'}
        </Botao>
      </div>
      <ErroFormulario mensagem={estado.erro} />
      {estado.aviso && (
        <p role="status" className="text-[15px] font-semibold text-sucesso">
          {estado.aviso}
        </p>
      )}
    </form>
  )
}
