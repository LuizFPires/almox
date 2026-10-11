import Link from 'next/link'
import { Cabecalho } from '@/components/Cabecalho'

type Props = { titulo: string; pessoaId: string; primeiro: string }

/** A conferência do capacete não vale mais: não vira manual sem o almoxarife escolher. */
export function ConferenciaVencida({ titulo, pessoaId, primeiro }: Props) {
  return (
    <>
      <Cabecalho
        titulo={titulo}
        subtitulo="Conferência não vale mais"
        voltarPara={`/pessoa/${pessoaId}`}
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-6">
        <p role="alert" className="rounded-cartao bg-aviso-claro px-4 py-3.5 text-[17px]">
          A conferência do capacete não vale mais (dura 10 minutos e é de quem leu). Leia o capacete
          do {primeiro} de novo.
        </p>
        <Link
          href="/leitura"
          className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro px-5 text-lg font-bold text-white"
        >
          Ler o capacete
        </Link>
        <Link
          href={`/pessoa/${pessoaId}?via=manual`}
          className="flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-5 text-lg font-bold"
        >
          Escolher na lista (manual)
        </Link>
      </main>
    </>
  )
}
