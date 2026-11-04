import Link from 'next/link'
import { IconeInterface, type NomeIconeInterface } from './IconeInterface'

const ACOES: { href: string; rotulo: string; icone: NomeIconeInterface; classe: string }[] = [
  {
    href: '/materiais/entrada',
    rotulo: 'Entrada',
    icone: 'entrada',
    classe: 'text-[#14532D] hover:border-[#14532D] focus-visible:border-[#14532D]',
  },
  {
    href: '/materiais/saida',
    rotulo: 'Saída',
    icone: 'saida',
    classe: 'text-[#7F1D1D] hover:border-[#7F1D1D] focus-visible:border-[#7F1D1D]',
  },
  {
    href: '/materiais/contagem',
    rotulo: 'Contagem',
    icone: 'contagem',
    classe: 'text-[#111827] hover:border-[#111827] focus-visible:border-[#111827]',
  },
]

/** Entrada, Saída e Contagem. Consulta só olha: não vê os atalhos de lançamento. */
export function AcoesMateriais({ podeLancar }: { podeLancar: boolean }) {
  if (!podeLancar) return null
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {ACOES.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-cartao border-[1.5px] border-[#D1D5DB] bg-white px-1 pt-3.5 pb-3 text-[14px] font-extrabold transition-colors ${a.classe}`}
        >
          <IconeInterface nome={a.icone} tamanho={40} />
          {a.rotulo}
        </Link>
      ))}
    </div>
  )
}
