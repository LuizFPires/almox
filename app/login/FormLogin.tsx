'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { CampoSenha } from '@/components/CampoSenha'
import { Campo } from '@/components/Formulario'
import { entrarComSenha } from './acoes'

const CLASSE_ATALHO =
  'flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-4 text-center text-base font-bold'

/** E-mail e senha (com o olho). Abaixo, os dois caminhos de quem não entra: senha e conta. */
export function FormLogin({ volta }: { volta: string }) {
  const [estado, acao, entrando] = useActionState(entrarComSenha, {})
  // O e-mail digitado segue para "Esqueci a senha", para não digitar de novo.
  const [email, setEmail] = useState(estado.email ?? '')
  const recuperar = email.trim()
    ? `/recuperar-senha?email=${encodeURIComponent(email.trim())}`
    : '/recuperar-senha'

  return (
    <div className="flex flex-col gap-6">
      <form action={acao} className="flex flex-col gap-3">
        <input type="hidden" name="volta" value={volta} />
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={estado.email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <CampoSenha rotulo="Senha" name="senha" autoComplete="current-password" required />
        {estado.erro && (
          <p role="alert" className="rounded-botao bg-erro-claro px-3 py-2.5 text-[15px] text-erro">
            {estado.erro}
          </p>
        )}
        <Botao type="submit" tamanho="g" larguraTotal disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </Botao>
        <p className="text-center text-sm text-texto-2">
          Você continua conectado neste aparelho até sair.
        </p>
      </form>

      <nav aria-label="Outros caminhos" className="flex flex-col gap-3">
        <Link href={recuperar} className={CLASSE_ATALHO}>
          Esqueci a senha
        </Link>
        <Link href="/criar-conta" className={CLASSE_ATALHO}>
          Criar conta
        </Link>
      </nav>
    </div>
  )
}
