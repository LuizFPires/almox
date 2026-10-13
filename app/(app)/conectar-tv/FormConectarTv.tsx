'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { conectarTv } from './acoes'

/** Código que aparece na TV (já vem preenchido quando o celular leu o QR dela). */
export function FormConectarTv({ codigo }: { codigo?: string }) {
  const [estado, acao, enviando] = useActionState(conectarTv, {})

  if (estado.conectada) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-cartao bg-sucesso-claro px-4 py-4 text-sucesso"
      >
        <span className="text-lg font-bold">“{estado.conectada}” conectada</span>
        <span className="text-[15px]">
          Em alguns segundos o painel aparece na TV. Não precisa mexer nela.
        </span>
        <Link href="/inicio" className="min-h-toque self-start font-bold underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo
        rotulo="Código que aparece na TV"
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="000 000"
        defaultValue={estado.codigo ?? codigo ?? ''}
        className="font-mono text-2xl tracking-[0.2em]"
        required
      />
      <Campo
        rotulo="Nome da TV (opcional)"
        name="nome"
        maxLength={60}
        placeholder="TV do almoxarifado"
        defaultValue={estado.nome ?? ''}
        autoComplete="off"
      />
      <ErroFormulario mensagem={estado.erro} />
      <p className="rounded-cartao bg-aviso-claro px-3.5 py-2.5 text-sm text-aviso">
        Só conecte se o código está na <b>TV do almoxarifado, na sua frente</b>. Código mandado por
        mensagem pode ser de outra pessoa.
      </p>
      <Botao type="submit" tamanho="g" larguraTotal disabled={enviando}>
        {enviando ? 'Conectando…' : 'Conectar TV'}
      </Botao>
    </form>
  )
}
