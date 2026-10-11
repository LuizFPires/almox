import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Marca } from '@/components/Marca'
import { destinoSeguro } from '@/lib/dominio/destino'
import { FormLogin } from './FormLogin'

export const metadata: Metadata = { title: 'Entrar · Almox' }

async function Formulario({
  searchParams,
}: {
  searchParams: Promise<{ volta?: string; erro?: string }>
}) {
  const { volta, erro } = await searchParams
  return (
    <>
      {erro === 'link' && (
        <p role="alert" className="rounded-botao bg-erro-claro px-3 py-2.5 text-[15px] text-erro">
          O link não funcionou. Ele vale uma vez, por pouco tempo, e no mesmo celular em que foi
          pedido. Peça outro.
        </p>
      )}
      <FormLogin volta={destinoSeguro(volta)} />
    </>
  )
}

export default function PaginaLogin({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-3">
        <h1>
          <Marca altura={44} />
        </h1>
        <p className="text-texto-2">Controle de ferramentas do almoxarifado.</p>
      </div>
      <Suspense>
        <Formulario searchParams={searchParams as Promise<{ volta?: string; erro?: string }>} />
      </Suspense>
      <p className="text-sm text-texto-2">
        O acesso é por convite do engenheiro da obra. Sem login? Fale com ele.
      </p>
    </main>
  )
}
