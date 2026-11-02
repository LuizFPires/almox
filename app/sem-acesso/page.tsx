import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Botao } from '@/components/Botao'
import { Marca } from '@/components/Marca'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { sair } from '../login/acoes'

export const metadata: Metadata = { title: 'Sem acesso · Almox' }

/** Conta criada (ou obra encerrada): a pessoa precisa que o engenheiro a ligue a uma obra. */
async function Conteudo() {
  await connection()
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const email = typeof data?.claims?.email === 'string' ? data.claims.email : ''
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">Falta o engenheiro liberar</h1>
        <p className="text-texto-2">
          Sua conta existe, mas ainda não está ligada a nenhuma obra em andamento. Peça ao
          engenheiro da obra para liberar o seu acesso.
        </p>
      </div>
      <div className="rounded-cartao bg-cartao px-4 py-3">
        <b className="block">O que dizer a ele</b>
        <p className="text-[15px] text-texto-2">
          “Criei minha conta no Almox com o e-mail{' '}
          <strong className="break-all text-texto">{email}</strong>. Me libera em Cadastros ›
          Acessos?” Ele encontra você em <b>Contas aguardando obra</b> e escolhe o seu perfil.
        </p>
      </div>
      <Link
        href="/inicio"
        className="flex min-h-14 items-center justify-center rounded-cartao bg-amarelo text-lg font-bold text-texto"
      >
        Já liberou? Entrar
      </Link>
      <form action={sair}>
        <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
          Sair
        </Botao>
      </form>
    </>
  )
}

export default function PaginaSemAcesso() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <Marca altura={36} />
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  )
}
