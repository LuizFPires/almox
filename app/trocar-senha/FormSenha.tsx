'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'
import { trocarSenha } from './acoes'

/** `email` vai num campo escondido para o gerenciador de senhas salvar o login certo. */
export function FormSenha({ email }: { email: string }) {
  const [estado, acao, salvando] = useActionState(trocarSenha, {})
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
      <Campo
        rotulo="Nova senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        required
        ajuda={`Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`}
      />
      <Campo
        rotulo="Repita a nova senha"
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        required
      />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar nova senha'}
      </Botao>
    </form>
  )
}
