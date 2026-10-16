'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { ErroFormulario } from '@/components/Formulario'
import { novaSenhaProvisoria } from '../acoes'
import { SenhaInicial } from '../SenhaInicial'

/** Para quem ainda não entrou: nova senha do primeiro acesso (a anterior para de valer). */
export function NovaSenhaProvisoria({ usuarioId }: { usuarioId: string }) {
  const [estado, acao, gerando] = useActionState(novaSenhaProvisoria, {})
  if (estado.senha) {
    return (
      <div className="flex flex-col gap-2 pb-3">
        <p className="text-[15px]">Senha nova (aparece só agora):</p>
        <p
          aria-label="Senha do primeiro acesso"
          className="rounded-botao bg-sutil px-4 py-3 text-center font-mono text-2xl font-bold tracking-wider select-all"
        >
          {estado.senha}
        </p>
        <p className="text-sm text-texto-2">
          A senha anterior parou de valer. No primeiro login a pessoa cria uma senha só dela.
        </p>
      </div>
    )
  }
  return (
    <form action={acao} className="flex flex-col gap-3 pb-3">
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <p className="text-sm text-texto-2">
        A senha anterior para de valer. No próximo login a pessoa cria uma senha só dela.
      </p>
      <SenhaInicial />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" variante="secundaria" larguraTotal disabled={gerando}>
        {gerando ? 'Gerando…' : 'Gerar nova senha'}
      </Botao>
    </form>
  )
}
