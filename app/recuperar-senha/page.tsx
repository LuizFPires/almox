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
      <h1 className="text-[28px] font-bold tracking-tight">Primeiro acesso ou esqueceu a senha?</h1>
      <p className="text-texto-2">
        Quem libera o acesso ao Almox é o engenheiro da obra. Peça a ele:
      </p>
      <ul className="flex flex-col gap-3">
        <li className="rounded-cartao bg-cartao px-4 py-3">
          <b className="block">Primeiro acesso</b>
          <span className="text-[15px] text-texto-2">
            Ele cadastra seu e-mail em <b>Cadastros › Acessos</b> e te passa a senha para entrar.
          </span>
        </li>
        <li className="rounded-cartao bg-cartao px-4 py-3">
          <b className="block">Esqueceu a senha</b>
          <span className="text-[15px] text-texto-2">
            Ele gera uma senha nova no seu acesso. Ao entrar, você cria uma senha só sua.
          </span>
        </li>
      </ul>
      <Link
        href="/login"
        className="flex min-h-toque items-center justify-center rounded-botao bg-escuro font-bold text-white"
      >
        Voltar para entrar
      </Link>
    </>
  )
}
