'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { criarObra, editarObra } from './acoes'

/** Nome e endereço da obra: cria (sem `obra`) ou edita. */
export function FormObra({
  obra,
}: {
  obra?: { id: string; nome: string; endereco: string | null }
}) {
  const [estado, acao, salvando] = useActionState(obra ? editarObra : criarObra, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}
  return (
    <form action={acao} className="flex flex-col gap-5">
      {obra && <input type="hidden" name="obra_id" value={obra.id} />}
      <Campo
        rotulo="Nome da obra"
        name="nome"
        defaultValue={v.nome ?? obra?.nome}
        required
        erro={erros.nome}
      />
      <Campo
        rotulo="Endereço"
        name="endereco"
        defaultValue={v.endereco ?? obra?.endereco ?? ''}
        erro={erros.endereco}
        ajuda="Aparece na TV ao conectar e nos e-mails."
      />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : obra ? 'Salvar obra' : 'Criar obra'}
      </Botao>
    </form>
  )
}
