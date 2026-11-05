'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { ligarEngenheiro } from '../../acoes'

/** Liga o engenheiro da obra (login novo ou de outra obra). */
export function FormEngenheiro({ obraId }: { obraId: string }) {
  const [estado, acao, salvando] = useActionState(ligarEngenheiro, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}

  if (estado.criado)
    return (
      <p role="status" className="p-5">
        Convite enviado para {estado.criado.email}. A pessoa deve entrar no ALMOX e aceitar no menu
        Convites.
      </p>
    )

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

      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Enviando...' : 'Enviar convite'}
      </Botao>
    </form>
  )
}
