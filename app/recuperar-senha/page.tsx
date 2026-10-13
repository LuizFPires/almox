import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Marca } from '@/components/Marca'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { FormRecuperar } from './FormRecuperar'

export const metadata: Metadata = { title: 'Senha · Almox' }

/** Aberta com ou sem sessão: esqueci a senha, primeira senha e trocar a senha (Conta). */
async function Conteudo() {
  await connection()
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email
  const emailDaConta = typeof email === 'string' && email ? email : null
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight">
        {emailDaConta ? 'Trocar senha' : 'Recuperar acesso'}
      </h1>
      <FormRecuperar emailDaConta={emailDaConta} />
    </>
  )
}

export default function PaginaRecuperarSenha() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <Marca altura={36} />
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  )
}
