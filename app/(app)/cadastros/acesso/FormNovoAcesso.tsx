'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Cartao } from '@/components/Cartao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { darAcesso } from './acoes'
import { CamposPerfil } from './CamposPerfil'
import { SenhaInicial } from '@/components/SenhaInicial'

export function FormNovoAcesso({ empreiteiras }: { empreiteiras: { id: string; nome: string }[] }) {
  const [estado, acao, salvando] = useActionState(darAcesso, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}

  if (estado.criado) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <Cartao className="flex flex-col gap-3 py-5">
          <h2 className="text-xl font-bold">Acesso liberado</h2>
          <p className="text-[15px]">
            <b>{estado.criado.email}</b> já pode entrar no Almox.
          </p>
          {estado.criado.jaExistia && (
            <p className="text-sm text-texto-2">
              Este e-mail já tinha login em outra obra: o nome continua o do cadastro dele.
            </p>
          )}
          {estado.criado.senha ? (
            <>
              <p className="text-[15px]">Senha do primeiro acesso (aparece só agora):</p>
              <p
                aria-label="Senha provisória"
                className="rounded-botao bg-sutil px-4 py-3 text-center font-mono text-2xl font-bold tracking-wider select-all"
              >
                {estado.criado.senha}
              </p>
              <p className="text-sm text-texto-2">
                Passe pessoalmente ou por mensagem. No primeiro acesso a pessoa é obrigada a criar
                uma senha nova.
              </p>
            </>
          ) : (
            <p className="text-sm text-texto-2">
              {estado.criado.senhaPendente
                ? 'Ela ainda não entrou pela primeira vez. Se perdeu a senha do primeiro acesso, gere outra na tela dela em Acessos.'
                : 'A pessoa entra com a senha que já usa.'}
            </p>
          )}
        </Cartao>
        <Link
          href="/cadastros/usuarios"
          className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro text-lg font-bold text-white"
        >
          Pronto
        </Link>
      </main>
    )
  }

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        <Campo rotulo="Nome" name="nome" defaultValue={v.nome} required erro={erros.nome} />
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          defaultValue={v.email}
          required
          erro={erros.email}
          ajuda="É o login. Para dono e encarregado de empreiteira, use o e-mail que recebe os avisos."
        />
        <CamposPerfil
          perfil={v.perfil}
          empresaId={v.empresa_id}
          empreiteiras={empreiteiras}
          erros={erros}
        />
        <SenhaInicial erro={erros.senha_inicial} />
        <ErroFormulario mensagem={estado.erro} />
      </div>
      <RodapeAcao>
        <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
          {salvando ? 'Liberando…' : 'Dar acesso'}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
