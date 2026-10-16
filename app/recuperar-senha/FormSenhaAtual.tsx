'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { CampoSenha } from '@/components/CampoSenha'
import { TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'
import { trocarComSenhaAtual } from './acoes'

/** Trocar a senha com a senha atual (enquanto o código por e-mail não chega para todos). */
export function FormSenhaAtual({ email }: { email: string }) {
  const [estado, acao, salvando] = useActionState(trocarComSenhaAtual, {})
  const [visiveis, setVisiveis] = useState(false)
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
      <CampoSenha
        rotulo="Senha atual"
        name="atual"
        autoComplete="current-password"
        required
        erro={estado.erro}
      />
      <CampoSenha
        rotulo="Nova senha"
        name="senha"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        required
        visivel={visiveis}
        aoAlternar={() => setVisiveis((v) => !v)}
        erro={estado.erroSenha}
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
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar senha'}
      </Botao>
      <p className="text-center text-sm text-texto-2">
        Ao salvar, os outros aparelhos conectados nesta conta saem.
      </p>
      <Link
        href="/conta"
        className="flex min-h-toque items-center justify-center font-semibold underline"
      >
        Voltar
      </Link>
    </form>
  )
}
