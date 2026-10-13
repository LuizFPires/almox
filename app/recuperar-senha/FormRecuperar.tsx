'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { CampoSenha } from '@/components/CampoSenha'
import { Campo } from '@/components/Formulario'
import { DIGITOS_CODIGO, limparCodigo, TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'
import { pedirCodigo, salvarSenha, type EstadoRecuperar } from './acoes'

type Props = {
  /** Conectado: o código vai para o e-mail da própria conta. */
  emailDaConta: string | null
}

/**
 * Definir, recuperar ou trocar a senha, sempre pelo código de 8 dígitos enviado ao e-mail
 * (também com a sessão aberta: celular desbloqueado na obra não troca a senha de ninguém).
 */
export function FormRecuperar({ emailDaConta }: Props) {
  const inicial: EstadoRecuperar = { passo: 'email', email: emailDaConta ?? '' }
  const [pedido, pedir, pedindo] = useActionState(pedirCodigo, inicial)
  const [salvo, salvar, salvando] = useActionState(salvarSenha, { passo: 'codigo' })
  // O passo vem da última ação respondida; "Pedir outro código" volta ao e-mail.
  const [ultima, setUltima] = useState<'pedido' | 'salvo'>('pedido')
  const [outroCodigo, setOutroCodigo] = useState(false)
  const estado = ultima === 'salvo' ? salvo : pedido
  const passo = outroCodigo ? 'email' : estado.passo
  const email = estado.email ?? pedido.email ?? emailDaConta ?? ''

  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [visiveis, setVisiveis] = useState(false)

  if (passo === 'email') {
    return (
      <form
        action={(form) => {
          setUltima('pedido')
          setOutroCodigo(false)
          return pedir(form)
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-texto-2">
          {emailDaConta
            ? `Para trocar a senha, enviamos um código de ${DIGITOS_CODIGO} dígitos para ${emailDaConta}.`
            : `Informe seu e-mail. Enviamos um código de ${DIGITOS_CODIGO} dígitos para você criar a senha.`}
        </p>
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={email}
          readOnly={Boolean(emailDaConta)}
          required
          erro={estado.erro}
        />
        <Botao type="submit" tamanho="g" larguraTotal disabled={pedindo}>
          {pedindo ? 'Enviando…' : 'Enviar código'}
        </Botao>
        <Link
          href={emailDaConta ? '/conta' : '/login'}
          className="flex min-h-toque items-center justify-center font-semibold underline"
        >
          Voltar
        </Link>
      </form>
    )
  }

  return (
    <form
      action={(form) => {
        setUltima('salvo')
        return salvar(form)
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="passo" value={passo} />
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      {passo === 'codigo' ? (
        <>
          <p role="status" className="text-texto-2">
            Se houver acesso para <strong className="text-texto">{email}</strong>, o código chega em
            instantes. Vale 15 minutos. Confira também o spam.
          </p>
          <Campo
            rotulo="Código do e-mail"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${DIGITOS_CODIGO}}`}
            maxLength={DIGITOS_CODIGO}
            value={codigo}
            onChange={(e) => setCodigo(limparCodigo(e.target.value))}
            required
            erro={estado.erro}
            className="font-mono text-lg tracking-[0.3em]"
          />
        </>
      ) : (
        <p
          role="status"
          className="rounded-botao bg-sucesso-claro px-3 py-2.5 text-[15px] text-sucesso"
        >
          Código conferido. Agora escolha a senha.
        </p>
      )}
      <CampoSenha
        rotulo="Nova senha"
        name="senha"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        visivel={visiveis}
        aoAlternar={() => setVisiveis((v) => !v)}
        required
        erro={estado.erroSenha}
        ajuda={`Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`}
      />
      <CampoSenha
        rotulo="Repita a nova senha"
        name="confirmacao"
        autoComplete="new-password"
        minLength={TAMANHO_MINIMO_SENHA}
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        visivel={visiveis}
        semOlho
        required
      />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar senha'}
      </Botao>
      <p className="text-center text-sm text-texto-2">
        Ao salvar, os outros aparelhos conectados nesta conta saem.
      </p>
      {passo === 'codigo' && (
        <button
          type="button"
          onClick={() => {
            setCodigo('')
            setOutroCodigo(true)
          }}
          className="flex min-h-toque items-center justify-center font-semibold underline"
        >
          Pedir outro código
        </button>
      )}
    </form>
  )
}
