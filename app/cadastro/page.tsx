'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { cadastrar } from './acoes'
export default function Cadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, { mensagem: '' })
  return (
    <main className="mx-auto max-w-[420px] p-5">
      <h1 className="text-2xl font-bold">Criar conta no ALMOX</h1>
      <p>Após criar sua conta, aceite os convites para participar das obras.</p>
      <form action={acao} className="flex flex-col gap-4 py-5">
        <label>
          Nome
          <input className="block rounded border p-3" name="nome" required autoComplete="name" />
        </label>
        <label>
          E-mail
          <input
            className="block rounded border p-3"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            className="block rounded border p-3"
            name="senha"
            type="password"
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirme a senha
          <input
            className="block rounded border p-3"
            name="confirmacao"
            type="password"
            required
            autoComplete="new-password"
          />
        </label>
        <p role="status">{estado.mensagem}</p>
        <button disabled={pendente}>{pendente ? 'Criando...' : 'Criar conta'}</button>
      </form>
      <Link href="/login">Entrar</Link>
    </main>
  )
}
