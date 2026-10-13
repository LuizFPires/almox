'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { CampoSenha } from '@/components/CampoSenha'
import { ErroFormulario } from '@/components/Formulario'
import { TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'
import { trocarSenha } from './acoes'

/** `email` vai num campo escondido para o gerenciador de senhas salvar o login certo. */
export function FormSenha({ email }: { email: string }) {
  const [estado, acao, salvando] = useActionState(trocarSenha, {})
  const [visiveis, setVisiveis] = useState(false)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
      <CampoSenha
        rotulo="Nova senha"
        name="senha"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        required
        visivel={visiveis}
        aoAlternar={() => setVisiveis((v) => !v)}
        ajuda={`Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`}
      />
      <CampoSenha
        rotulo="Repita a nova senha"
        name="confirmacao"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        required
        visivel={visiveis}
        semOlho
      />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar nova senha'}
      </Botao>
    </form>
  )
}
