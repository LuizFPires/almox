'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'
import { inativarMaterial, salvarMaterial } from '@/app/(app)/materiais/acoes'
import { Botao } from '@/components/Botao'
import { CLASSE_CAMPO, Campo, ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import {
  formatarQuantidade,
  UNIDADES_MATERIAL,
  type UnidadeMaterial,
} from '@/lib/formatos/quantidade'

type Props = {
  material?: {
    id: string
    nome: string
    unidade: UnidadeMaterial
    saldo: number
    ativo: boolean
    /** Texto da linha "Aviso de limite" (ex.: "aviso em 20 sc"). */
    textoAviso: string
  }
  /** Já tem lançamento: a unidade não muda mais. */
  temMovimentos?: boolean
  /** Pedido de cadastro que este material atende (vira o nome sugerido). */
  pedido?: { id: string; nome: string }
}

const VOLTAR = '/cadastros/materiais'

export function FormMaterial({ material, temMovimentos = false, pedido }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(material?.nome ?? pedido?.nome ?? '')
  const [unidade, setUnidade] = useState<UnidadeMaterial>(material?.unidade ?? 'sc')
  const [erro, setErro] = useState('')
  const [erroNome, setErroNome] = useState('')
  const [pendente, iniciar] = useTransition()

  function enviar(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.replace(/\s+/g, ' ').trim()
    if (limpo.length < 2) {
      setErroNome('Informe o nome do material.')
      return
    }
    setErroNome('')
    setErro('')
    iniciar(async () => {
      const r = await salvarMaterial({
        id: material?.id,
        nome: limpo,
        unidade,
        pedidoId: pedido?.id,
      })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      router.push(VOLTAR)
      router.refresh()
    })
  }

  function desativar() {
    if (!material) return
    setErro('')
    iniciar(async () => {
      const r = await inativarMaterial(material.id)
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      router.push(VOLTAR)
      router.refresh()
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        {material && !material.ativo && (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm font-semibold">
            Material desativado.
          </p>
        )}
        {pedido && (
          <p className="rounded-cartao bg-aviso-claro px-3.5 py-3 text-sm text-aviso">
            Atende o pedido de cadastro “{pedido.nome}”.
          </p>
        )}
        <Campo
          rotulo="Nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Cimento CP-II 50 kg"
          maxLength={120}
          autoComplete="off"
          erro={erroNome}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="material-unidade" className="text-sm font-semibold">
            Unidade
          </label>
          <select
            id="material-unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeMaterial)}
            disabled={temMovimentos}
            aria-describedby={temMovimentos ? 'material-unidade-ajuda' : undefined}
            className={CLASSE_CAMPO}
          >
            {UNIDADES_MATERIAL.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {temMovimentos && (
            <span id="material-unidade-ajuda" className="text-sm text-texto-2">
              A unidade não muda depois do primeiro lançamento.
            </span>
          )}
        </div>

        {material && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">
              Aviso de limite
            </h2>
            <Link
              href={`/cadastros/materiais/${material.id}/aviso`}
              className="flex min-h-toque items-center justify-between gap-2 rounded-cartao bg-cartao px-3.5 py-3 text-[15px] font-semibold"
            >
              {material.textoAviso}
              <span aria-hidden="true" className="text-xl text-texto-2">
                ›
              </span>
            </Link>
          </div>
        )}

        {material?.ativo && (
          <div className="flex flex-col gap-1.5">
            {material.saldo === 0 ? (
              <Botao variante="secundaria" disabled={pendente} onClick={desativar}>
                Desativar material
              </Botao>
            ) : (
              <p className="text-sm text-texto-2">
                Para desativar, o saldo precisa ser zero (agora:{' '}
                {formatarQuantidade(material.saldo)} {material.unidade}).
              </p>
            )}
          </div>
        )}

        <ErroFormulario mensagem={erro} />
      </div>

      <RodapeAcao>
        <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar'}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
