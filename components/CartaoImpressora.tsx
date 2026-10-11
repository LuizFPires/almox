import Link from 'next/link'
import { IconeInterface } from '@/components/IconeInterface'

type Props = { impressora: { nome: string; rolo: string | null } | null }

/** Cartão no topo de Cadastros: impressora de adesivos da obra (protótipo › Cadastros). */
export function CartaoImpressora({ impressora }: Props) {
  return (
    <Link
      href="/cadastros/impressora"
      className={`flex min-h-toque items-center gap-3 rounded-cartao border bg-cartao px-4 py-3 ${
        impressora ? 'border-borda' : 'border-2 border-erro'
      }`}
    >
      <IconeInterface nome="qr-code" className={impressora ? 'text-texto-2' : 'text-erro'} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold">
          {impressora ? impressora.nome : 'Nenhuma impressora escolhida'}
        </span>
        <span className="truncate text-[13px] text-texto-2">
          {impressora ? (impressora.rolo ?? 'Adesivo do capacete') : 'Os adesivos não vão imprimir'}
        </span>
      </span>
      <span className="text-sm font-bold text-engenheiro">{impressora ? 'Trocar' : 'Escolher'}</span>
    </Link>
  )
}
