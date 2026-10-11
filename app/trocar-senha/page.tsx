import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Marca } from '@/components/Marca'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { FormSenha } from './FormSenha'

export const metadata: Metadata = { title: 'Trocar senha · Almox' }

/** Fora de (app): não passa por obterSessao, que mandaria de volta para cá. */
async function Conteudo() {
  await connection()
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const obrigatoria = Boolean(
    (data?.claims?.app_metadata as Record<string, unknown> | undefined)?.trocar_senha,
  )
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">
          {obrigatoria ? 'Crie sua senha' : 'Trocar senha'}
        </h1>
        <p className="text-texto-2">
          {obrigatoria
            ? 'Você entrou com uma senha provisória. Crie uma senha só sua para continuar.'
            : 'Escolha a nova senha de acesso ao Almox.'}
        </p>
      </div>
      <FormSenha email={typeof data?.claims?.email === 'string' ? data.claims.email : ''} />
      {!obrigatoria && (
        <Link
          href="/conta"
          className="flex min-h-toque items-center justify-center font-semibold underline"
        >
          Voltar
        </Link>
      )}
    </>
  )
}

export default function PaginaTrocarSenha() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <Marca altura={36} />
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  )
}
