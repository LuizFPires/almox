'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { formatarBRL } from '@/lib/formatos/moeda'
import { fecharMedicao } from './acoes'

/** "Fechar medição" de uma empreiteira, com a data da próxima. */
export function FormMedicao({
  empresa,
  total,
  proximaAtual,
}: {
  empresa: string
  total: number
  proximaAtual: string | null
}) {
  const [estado, acao, fechando] = useActionState(fecharMedicao, {})
  return (
    <form action={acao} className="flex flex-col gap-3 border-t border-borda pt-3">
      <input type="hidden" name="empresa" value={empresa} />
      <Campo
        rotulo="Próxima medição"
        name="proxima"
        type="date"
        required
        defaultValue={
          proximaAtual && proximaAtual > new Date().toISOString().slice(0, 10) ? proximaAtual : ''
        }
        ajuda="Os descontos em aberto entram nesta medição; os próximos, na seguinte."
      />
      <ErroFormulario mensagem={estado.erro} />
      {estado.aviso && (
        <p
          role="status"
          className="rounded-botao bg-sucesso-claro px-3 py-2.5 text-[15px] text-sucesso"
        >
          {estado.aviso}
        </p>
      )}
      <Botao type="submit" variante="engenheiro" larguraTotal disabled={fechando || total === 0}>
        {fechando ? 'Fechando…' : `Fechar medição (${formatarBRL(total)})`}
      </Botao>
    </form>
  )
}
