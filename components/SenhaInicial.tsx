'use client'

import { useState } from 'react'
import { CampoSenha } from '@/components/CampoSenha'
import { TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'

/**
 * Senha do primeiro acesso: o app gera (padrão) ou o engenheiro digita. Vai no formulário como
 * `senha_inicial_modo` e `senha_inicial`. A pessoa cria a dela ao entrar, nos dois casos.
 */
export function SenhaInicial({ erro }: { erro?: string }) {
  const [modo, setModo] = useState<'gerar' | 'escolher'>('gerar')
  const opcao = (valor: 'gerar' | 'escolher', titulo: string, detalhe: string) => (
    <label
      className={`flex min-h-toque cursor-pointer items-start gap-3 rounded-botao border-2 px-3 py-2.5 ${
        modo === valor ? 'border-escuro' : 'border-borda'
      }`}
    >
      <input
        type="radio"
        name="senha_inicial_modo"
        value={valor}
        checked={modo === valor}
        onChange={() => setModo(valor)}
        className="mt-1 size-4 accent-[var(--color-escuro)]"
      />
      <span className="flex flex-col">
        <span className="font-semibold">{titulo}</span>
        <span className="text-sm text-texto-2">{detalhe}</span>
      </span>
    </label>
  )
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">Senha do primeiro acesso</legend>
      {opcao('gerar', 'O app gera uma senha', 'Aparece uma vez, para você passar à pessoa.')}
      {opcao('escolher', 'Eu escolho a senha', `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`)}
      {modo === 'escolher' && (
        <CampoSenha
          rotulo="Senha inicial"
          name="senha_inicial"
          autoComplete="new-password"
          minLength={TAMANHO_MINIMO_SENHA}
          required
          erro={erro}
          ajuda="No primeiro login a pessoa é obrigada a criar uma senha só dela."
        />
      )}
      {modo === 'gerar' && erro && <span className="text-sm font-semibold text-erro">{erro}</span>}
    </fieldset>
  )
}
