'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { formatarBRL } from '@/lib/formatos/moeda'
import { ajustarIndenizacao } from './acoes'

type Props = { id: string; valor: number; valorReposicao: number; ajustado: boolean }

/** "289000" → "2.890,00" para o campo. */
const paraCampo = (centavos: number) => formatarBRL(centavos).replace(/^R\$\s/, '')

/** Engenheiro: ajustar a indenização (ex.: custo do conserto) ou voltar ao valor de reposição. */
export function FormIndenizacao({ id, valor, valorReposicao, ajustado }: Props) {
  const [estado, acao, salvando] = useActionState(ajustarIndenizacao, {})
  const [aberto, setAberto] = useState(false)
  // Salvou: fecha o formulário (ajuste de estado durante o render, sem efeito).
  const [ultimo, setUltimo] = useState(estado)
  if (estado !== ultimo) {
    setUltimo(estado)
    if (estado.ok) setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="min-h-toque self-start text-[15px] font-bold text-engenheiro underline"
      >
        Ajustar valor
      </button>
    )
  }
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Campo
        rotulo="Valor da indenização"
        name="valor"
        inputMode="decimal"
        defaultValue={paraCampo(valor)}
        prefixo="R$"
        ajuda="Ex.: o custo do conserto. Zero dispensa a cobrança."
        autoFocus
      />
      <ErroFormulario mensagem={estado.erro} />
      <div className="flex gap-2">
        <Botao type="submit" disabled={salvando} className="flex-1">
          {salvando ? 'Salvando…' : 'Salvar valor'}
        </Botao>
        <Botao type="button" variante="secundaria" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
      {ajustado && (
        <button
          type="submit"
          name="reposicao"
          value="1"
          disabled={salvando}
          className="min-h-toque self-start text-sm font-semibold underline"
        >
          Voltar ao valor de reposição ({formatarBRL(valorReposicao)})
        </button>
      )}
    </form>
  )
}
