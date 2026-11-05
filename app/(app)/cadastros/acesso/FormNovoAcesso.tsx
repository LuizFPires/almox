'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { darAcesso } from './acoes'
import { CamposPerfil } from './CamposPerfil'

export function FormNovoAcesso({ empreiteiras }: { empreiteiras: { id: string; nome: string }[] }) {
  const [estado, acao, salvando] = useActionState(darAcesso, {})
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

        <ErroFormulario mensagem={estado.erro} />
      </div>
      <RodapeAcao>
        <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
          {salvando ? 'Enviando...' : 'Enviar convite'}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
