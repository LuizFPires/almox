import type { TextoIdentificacao } from '@/lib/dominio/ficha'

const TONS = { sucesso: 'text-sucesso', erro: 'text-erro', neutro: 'text-texto-2' } as const

type Props = {
  pessoa: { nome: string; iniciais: string }
  identificacao: TextoIdentificacao
}

/** Quem está retirando ou devolvendo, e como foi identificado (QR conferido / sem QR). */
export function CartaoPessoaLancamento({ pessoa, identificacao }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-cartao bg-cartao px-4 py-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-escuro font-bold text-amarelo"
      >
        {pessoa.iniciais}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base font-bold">{pessoa.nome}</span>
        <span className={`text-[13px] font-semibold ${TONS[identificacao.tom]}`}>
          {identificacao.texto}
        </span>
      </span>
    </div>
  )
}

/** Iniciais para o avatar (primeira e última palavra). */
export function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}
