'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { SenhaInicial } from '@/components/SenhaInicial'
import { ligarEngenheiro } from '../../acoes'

/** Liga o engenheiro da obra (login novo ou de outra obra). */
export function FormEngenheiro({ obraId }: { obraId: string }) {
  const [estado, acao, salvando] = useActionState(ligarEngenheiro, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}

  if (estado.criado) {
    return (
      <div className="flex flex-col gap-2 pb-3">
        <p className="text-[15px]">
          <b>{estado.criado.email}</b> agora é engenheiro desta obra.
        </p>
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
              Passe pessoalmente ou por mensagem. No primeiro login ele cria uma senha só dele.
            </p>
          </>
        ) : (
          <p className="text-sm text-texto-2">
            Este e-mail já tinha login: ele entra com a senha que já usa.
          </p>
        )}
        {/* Recarrega a obra: a lista de acessos passa a mostrar o engenheiro. */}
        <a
          href={`/administracao/obra/${obraId}`}
          className="flex min-h-toque items-center justify-center rounded-botao bg-escuro font-bold text-white"
        >
          Pronto
        </a>
      </div>
    )
  }

  return (
    <form action={acao} className="flex flex-col gap-4 pb-3">
      <input type="hidden" name="obra_id" value={obraId} />
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
        ajuda="É o login. Se já entra em outra obra, a senha continua a mesma."
      />
      <SenhaInicial erro={erros.senha_inicial} />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Ligando…' : 'Ligar engenheiro'}
      </Botao>
    </form>
  )
}
