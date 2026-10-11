'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { estornar } from './acoes'

/** "Estornar" com motivo e confirmação (o lançamento original não é editado). */
export function FormEstorno({ id, oQueFaz }: { id: string; oQueFaz: string }) {
  const [estado, acao, enviando] = useActionState(estornar, {})
  const [aberto, setAberto] = useState(false)

  if (!aberto) {
    return (
      <Botao type="button" variante="secundaria" larguraTotal onClick={() => setAberto(true)}>
        Estornar este lançamento
      </Botao>
    )
  }
  return (
    <form
      action={acao}
      className="flex flex-col gap-3 rounded-cartao border-2 border-erro bg-cartao p-4"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-[15px]">
        <b>Estorno.</b> {oQueFaz} O lançamento original continua no histórico.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Motivo</span>
        <textarea
          name="motivo"
          required
          minLength={5}
          rows={3}
          placeholder="Ex.: lançado na pessoa errada"
          className="rounded-botao border border-borda bg-cartao px-3 py-2 text-[17px]"
        />
      </label>
      <ErroFormulario mensagem={estado.erro} />
      <div className="grid grid-cols-2 gap-2.5">
        <Botao type="button" variante="secundaria" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="perigo" disabled={enviando}>
          {enviando ? 'Estornando…' : 'Confirmar estorno'}
        </Botao>
      </div>
    </form>
  )
}
