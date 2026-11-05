import type { Metadata } from 'next'

import { connection } from 'next/server'

import { Suspense } from 'react'

import { Marca } from '@/components/Marca'

import { criarClienteServidor } from '@/lib/supabase/servidor'

import { codigoPorEmail } from '@/lib/configuracao'

import { FormRecuperar } from './FormRecuperar'

import { FormSenhaAtual } from './FormSenhaAtual'

import Link from 'next/link'

export const metadata: Metadata = { title: 'Senha · Almox' }

/** Aberta com ou sem sessão: esqueci a senha, primeira senha e trocar a senha (Conta). */

async function Conteudo() {
  await connection()

  const supabase = await criarClienteServidor()

  const { data } = await supabase.auth.getClaims()

  const email = data?.claims?.email

  const emailDaConta = typeof email === 'string' && email ? email : null

  if (!codigoPorEmail()) {
    return emailDaConta ? (
      <>
        <h1 className="text-[28px] font-bold tracking-tight">Trocar senha</h1>

        <FormSenhaAtual email={emailDaConta} />
      </>
    ) : (
      <SemEmail />
    )
  }

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

/** Sem e-mail para todos: o caminho é o engenheiro da obra, dito em duas linhas. */

function SemEmail() {
  return (
    <>
      <h1 className="text-2xl font-bold">Recuperar acesso</h1>

      <p>
        A recuperação por e-mail ainda precisa ser habilitada neste ambiente. Entre em contato com o
        suporte.
      </p>

      <Link href="/cadastro">Criar minha conta</Link>

      <Link href="/login">Voltar para entrar</Link>
    </>
  )
}
