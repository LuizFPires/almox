import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  estadoSaldo,
  limiteDoAviso,
  ordenarSaldos,
  type SaldoMaterial,
} from '@/lib/dominio/materiais'
import { formatarQuantidade } from '@/lib/formatos/quantidade'
import { Cartao } from './Cartao'

function Selo({ m }: { m: SaldoMaterial }) {
  const estado = estadoSaldo(m)
  if (estado === 'sem_aviso') return null
  const [classe, texto] =
    estado === 'abaixo'
      ? ['bg-erro-claro text-erro', `limite ${formatarQuantidade(limiteDoAviso(m) ?? 0)}`]
      : estado === 'perto'
        ? ['bg-aviso-claro text-aviso', 'perto do limite']
        : ['bg-sucesso-claro text-sucesso', 'ok']
  return (
    <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${classe}`}>{texto}</span>
  )
}

/** Saldo de cada material: os abaixo do limite primeiro. `destaque` pinta de vermelho os que estão abaixo. */
export function ListaSaldos({
  materiais,
  destaque = true,
  acao,
}: {
  materiais: SaldoMaterial[]
  destaque?: boolean
  /** Botão à direita de cada material (ex.: sino do aviso de limite, só engenheiro). */
  acao?: (m: SaldoMaterial) => ReactNode
}) {
  if (materiais.length === 0) {
    return (
      <Cartao className="py-6 text-center text-[15px] text-texto-2">
        Nenhum material cadastrado.
      </Cartao>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {ordenarSaldos(materiais).map((m) => {
        const abaixo = destaque && estadoSaldo(m) === 'abaixo'
        return (
          <li key={m.id} className="flex items-center gap-2">
            <Link
              href={`/materiais/${m.id}`}
              className={`flex min-h-toque min-w-0 flex-1 items-center gap-3 rounded-cartao px-4 py-3 ${
                abaixo ? 'bg-erro-claro' : 'bg-cartao'
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-semibold">{m.nome}</span>
              <Selo m={m} />
              <span
                className={`shrink-0 text-[17px] font-extrabold tabular-nums ${abaixo ? 'text-erro' : ''}`}
              >
                {formatarQuantidade(m.saldo)}{' '}
                <span className="text-sm font-semibold">{m.unidade}</span>
              </span>
            </Link>
            {acao?.(m)}
          </li>
        )
      })}
    </ul>
  )
}
