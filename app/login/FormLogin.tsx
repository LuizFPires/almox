'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { CampoSenha } from '@/components/CampoSenha'
import { Campo } from '@/components/Formulario'
import { entrarComSenha } from './acoes'

/** E-mail e senha (com o olho). Esqueceu ou ainda não tem senha: código no e-mail. */
export function FormLogin({ volta, codigoPorEmail }: { volta: string; codigoPorEmail: boolean }) {
  const [estado, acao, entrando] = useActionState(entrarComSenha, {})

  return (
    <div className="flex flex-col gap-4">
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

      <Link
        href="/recuperar-senha"
        className="flex min-h-toque items-center justify-center text-[15px] font-semibold text-texto-3 underline"
      >
        {codigoPorEmail
          ? 'Esqueci ou ainda não tenho senha'
          : 'Primeiro acesso ou esqueceu a senha?'}
      </Link>
    </div>
  )
}
