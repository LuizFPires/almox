'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { FormRecuperar } from '../recuperar-senha/FormRecuperar'
import { criarConta, type EstadoCriarConta } from './acoes'

/** Nome e e-mail; depois, o código e a senha (o mesmo passo de Esqueci a senha). */
export function FormCriarConta() {
  const inicial: EstadoCriarConta = { passo: 'dados' }
  const [estado, acao, enviando] = useActionState(criarConta, inicial)
  const erros = estado.campos ?? {}

  if (estado.passo === 'codigo' && estado.email) {
    return (
      <>
        <h1 className="text-[28px] font-bold tracking-tight">Confirme seu e-mail</h1>
        <FormRecuperar
          emailDaConta={null}
          inicial={{ passo: 'codigo', email: estado.email }}
          contaNova
        />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">Criar conta</h1>
        <p className="text-texto-2">
          Você recebe um código no e-mail e com ele cria a sua senha. Depois, o engenheiro da obra
          libera o seu acesso.
        </p>
      </div>
      <form action={acao} className="flex flex-col gap-4">
        <Campo
          rotulo="Seu nome"
          name="nome"
          autoComplete="name"
          defaultValue={estado.nome}
          required
          erro={erros.nome}
        />
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          defaultValue={estado.email}
          required
          erro={erros.email}
          ajuda="É o seu login. Use um e-mail que você abre no celular."
        />
        <ErroFormulario mensagem={estado.erro} />
        <Botao type="submit" tamanho="g" larguraTotal disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar código'}
        </Botao>
        <Link
          href="/login"
          className="flex min-h-toque items-center justify-center font-semibold underline"
        >
          Já tenho conta
        </Link>
      </form>
    </>
  )
}
