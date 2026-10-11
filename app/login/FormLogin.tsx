'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { entrarComSenha, enviarLinkMagico, type EstadoLogin } from './acoes'

const CLASSE_CAMPO =
  'min-h-toque w-full rounded-botao border border-borda bg-cartao px-3 text-base text-texto'

function Mensagem({ estado }: { estado: EstadoLogin }) {
  if (estado.erro) {
    return (
      <p role="alert" className="rounded-botao bg-erro-claro px-3 py-2.5 text-[15px] text-erro">
        {estado.erro}
      </p>
    )
  }
  if (estado.aviso) {
    return (
      <p
        role="status"
        className="rounded-botao bg-sucesso-claro px-3 py-2.5 text-[15px] text-sucesso"
      >
        {estado.aviso}
      </p>
    )
  }
  return null
}

export function FormLogin({ volta }: { volta: string }) {
  const [modo, setModo] = useState<'senha' | 'link'>('senha')
  const [estadoSenha, acaoSenha, entrando] = useActionState(entrarComSenha, {})
  const [estadoLink, acaoLink, enviando] = useActionState(enviarLinkMagico, {})

  return (
    <div className="flex flex-col gap-4">
      {modo === 'senha' ? (
        <form action={acaoSenha} className="flex flex-col gap-3">
          <input type="hidden" name="volta" value={volta} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={estadoSenha.email}
              required
              className={CLASSE_CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Senha
            <input
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              className={CLASSE_CAMPO}
            />
          </label>
          <Mensagem estado={estadoSenha} />
          <Botao type="submit" tamanho="g" larguraTotal disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </Botao>
        </form>
      ) : (
        <form action={acaoLink} className="flex flex-col gap-3">
          <input type="hidden" name="volta" value={volta} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={estadoLink.email}
              required
              className={CLASSE_CAMPO}
            />
          </label>
          <Mensagem estado={estadoLink} />
          <Botao type="submit" tamanho="g" larguraTotal disabled={enviando}>
            {enviando ? 'Enviando…' : 'Receber link por e-mail'}
          </Botao>
        </form>
      )}

      <button
        type="button"
        onClick={() => setModo(modo === 'senha' ? 'link' : 'senha')}
        className="min-h-toque text-[15px] font-semibold text-texto-3 underline"
      >
        {modo === 'senha' ? 'Entrar sem senha, com link no e-mail' : 'Entrar com senha'}
      </button>
    </div>
  )
}
