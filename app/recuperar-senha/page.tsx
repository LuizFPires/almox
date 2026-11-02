import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Marca } from '@/components/Marca'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { codigoPorEmail } from '@/lib/configuracao'
import { FormRecuperar } from './FormRecuperar'
import { FormSenhaAtual } from './FormSenhaAtual'
import { SemEmail } from './SemEmail'

export const metadata: Metadata = { title: 'Senha · Almox' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Aberta com ou sem sessão: esqueci a senha, primeira senha e trocar a senha (Conta). */
async function Conteudo({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  await connection()
  const supabase = await criarClienteServidor()
  const [{ data }, { email: sugerido }] = await Promise.all([
    supabase.auth.getClaims(),
    searchParams,
  ])
  const email = data?.claims?.email
  const emailDaConta = typeof email === 'string' && email ? email : null
  if (!codigoPorEmail()) {
    return emailDaConta ? (
      <>
        <h1 className="text-[28px] font-bold tracking-tight">Trocar senha</h1>
        <FormSenhaAtual email={emailDaConta} />
      </>
    ) : (
      <SemEmail titulo="Esqueceu a senha?" />
    )
  }
  // O e-mail digitado no login vem na URL, para não digitar de novo.
  const emailSugerido = sugerido && EMAIL.test(sugerido.trim()) ? sugerido.trim() : ''
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight">
        {emailDaConta ? 'Trocar senha' : 'Esqueci a senha'}
      </h1>
      <FormRecuperar emailDaConta={emailDaConta} emailSugerido={emailSugerido} />
    </>
  )
}

export default function PaginaRecuperarSenha({ searchParams }: PageProps<'/recuperar-senha'>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <Marca altura={36} />
      <Suspense>
        <Conteudo searchParams={searchParams as Promise<{ email?: string }>} />
      </Suspense>
    </main>
  )
}
