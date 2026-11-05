'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { salvarMaterial } from '@/app/(app)/materiais/acoes'
import { UNIDADES_MATERIAL, type UnidadeMaterial } from '@/lib/formatos/quantidade'
import { Botao } from './Botao'
import { CabecalhoGaveta, GavetaInferior } from './GavetaInferior'

type Pedido = { id: string; nome: string }

type PropsGaveta = {
  aberta: boolean
  onFechar(): void
  /** Pedido de cadastro do almoxarife que este material atende (vira o nome sugerido). */
  pedido?: Pedido
  /** Material salvo (a lista já foi mandada atualizar). */
  onSalvo?(id: string): void
}

const ROTULO_CAMPO = 'text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase'

/** Gaveta que sobe de baixo para o engenheiro cadastrar um material (nome e unidade). */
export function GavetaNovoMaterial({ aberta, onFechar, pedido, onSalvo }: PropsGaveta) {
  const router = useRouter()
  const [anterior, setAnterior] = useState(aberta)
  const [nome, setNome] = useState(pedido?.nome ?? '')
  const [unidade, setUnidade] = useState<UnidadeMaterial>('sc')
  const [erro, setErro] = useState('')
  const [salvando, iniciar] = useTransition()
  const idNome = useId()

  // Cada abertura começa do zero (ajuste de estado durante a renderização, sem efeito).
  if (aberta !== anterior) {
    setAnterior(aberta)
    if (aberta) {
      setNome(pedido?.nome ?? '')
      setUnidade('sc')
      setErro('')
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    const limpo = nome.replace(/\s+/g, ' ').trim()
    if (limpo.length < 2) {
      setErro('Informe o nome do material.')
      return
    }
    setErro('')
    iniciar(async () => {
      try {
        const r = await salvarMaterial({ nome: limpo, unidade, pedidoId: pedido?.id })
        if (!r.ok) {
          setErro(r.erro)
          return
        }
        router.refresh()
        onFechar()
        onSalvo?.(r.id)
      } catch {
        setErro('Sem conexão. Tente de novo.')
      }
    })
  }

  return (
    <GavetaInferior aberta={aberta} bloqueada={salvando} onFechar={onFechar} titulo="Novo material">
      <CabecalhoGaveta rotulo="Novo material" onFechar={onFechar} desativado={salvando} />
      <form onSubmit={enviar} className="flex flex-col gap-3">
        {pedido && (
          <p className="rounded-xl bg-aviso-claro px-3.5 py-2.5 text-sm text-aviso">
            Atende o pedido de cadastro “{pedido.nome}”.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor={idNome} className={ROTULO_CAMPO}>
            Nome
          </label>
          <input
            id={idNome}
            data-foco-inicial=""
            type="text"
            autoComplete="off"
            maxLength={120}
            placeholder="Ex.: Cimento CP-II 50 kg"
            value={nome}
            disabled={salvando}
            onChange={(e) => {
              setNome(e.currentTarget.value)
              setErro('')
            }}
            className="min-h-12 rounded-xl border-[1.5px] border-borda bg-fundo px-3.5 text-base"
          />
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className={`mb-1 ${ROTULO_CAMPO}`}>Unidade</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {UNIDADES_MATERIAL.map((u) => (
              <label
                key={u}
                className={`flex min-h-toque cursor-pointer items-center justify-center rounded-botao border text-[15px] font-extrabold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco ${
                  unidade === u ? 'border-escuro bg-escuro text-white' : 'border-borda bg-cartao'
                }`}
              >
                <input
                  type="radio"
                  name="unidade-material"
                  value={u}
                  checked={unidade === u}
                  disabled={salvando}
                  onChange={() => setUnidade(u)}
                  className="sr-only"
                />
                {u}
              </label>
            ))}
          </div>
          <span className="mt-0.5 text-xs text-texto-2">
            A unidade não muda depois do primeiro lançamento.
          </span>
        </fieldset>
        {erro && (
          <p
            role="alert"
            className="rounded-xl bg-erro-claro px-3.5 py-2.5 text-sm font-semibold text-erro"
          >
            {erro}
          </p>
        )}
        <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={salvando}>
          {salvando ? 'Salvando…' : 'Cadastrar material'}
        </Botao>
      </form>
    </GavetaInferior>
  )
}

/** Botão que abre a gaveta de novo material (o visual vem de quem usa). */
export function BotaoNovoMaterial({
  className,
  children,
  rotulo,
  pedido,
  onSalvo,
}: {
  className: string
  children: ReactNode
  /** Nome completo para leitor de tela, quando o texto visível é curto. */
  rotulo?: string
  pedido?: Pedido
  onSalvo?(id: string): void
}) {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
        className={className}
      >
        {children}
      </button>
      <GavetaNovoMaterial
        aberta={aberta}
        onFechar={() => setAberta(false)}
        pedido={pedido}
        onSalvo={onSalvo}
      />
    </>
  )
}
