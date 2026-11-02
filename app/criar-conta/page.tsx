import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Marca } from '@/components/Marca'
import { codigoPorEmail } from '@/lib/configuracao'
import { SemEmail } from '../recuperar-senha/SemEmail'
import { FormCriarConta } from './FormCriarConta'

export const metadata: Metadata = { title: 'Criar conta · Almox' }

async function Conteudo() {
  await connection()
  // Sem e-mail próprio no Auth o código não chega: o caminho é o engenheiro.
  if (!codigoPorEmail()) return <SemEmail titulo="Criar conta" />
  return <FormCriarConta />
}

export default function PaginaCriarConta() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <Marca altura={36} />
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  )
}
