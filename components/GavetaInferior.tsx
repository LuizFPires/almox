'use client'

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react'

const SELETOR_FOCAVEL =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
/** Igual à animação `gaveta-desce` em globals.css. */
const TEMPO_SAIDA_MS = 200

type Props = {
  aberta: boolean
  /** Trava o fechamento (ex.: envio a caminho do servidor). */
  bloqueada?: boolean
  onFechar(): void
  /** Título para leitor de tela (o visual fica a cargo do conteúdo). */
  titulo: string
  children: ReactNode
}

/**
 * Gaveta que sobe de baixo (protótipo de materiais): fundo escurecido, alça, animação de
 * subida e descida. Foco preso; Esc e toque no fundo fecham e devolvem o foco a quem abriu.
 * Ao abrir, o foco vai para o elemento com `data-foco-inicial` (ou para o próprio painel).
 */
export function GavetaInferior({ aberta, bloqueada = false, onFechar, titulo, children }: Props) {
  const [montada, setMontada] = useState(aberta)
  const [anterior, setAnterior] = useState(aberta)
  const painel = useRef<HTMLDivElement>(null)
  const idTitulo = useId()

  if (aberta !== anterior) {
    setAnterior(aberta)
    if (aberta) setMontada(true)
  }

  // Fechou: deixa a animação de descida terminar antes de desmontar.
  useEffect(() => {
    if (aberta || !montada) return
    const t = setTimeout(() => setMontada(false), TEMPO_SAIDA_MS)
    return () => clearTimeout(t)
  }, [aberta, montada])

  const fechar = () => {
    if (!bloqueada) onFechar()
  }
  const fecharPeloTeclado = useEffectEvent(fechar)

  useEffect(() => {
    if (!aberta) return
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const inicial = painel.current?.querySelector<HTMLElement>('[data-foco-inicial]')
    ;(inicial ?? painel.current)?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        fecharPeloTeclado()
        return
      }
      if (e.key !== 'Tab' || !painel.current) return
      const focaveis = [...painel.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)]
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]!
      const ultimo = focaveis[focaveis.length - 1]!
      const ativo = document.activeElement
      if (e.shiftKey && (ativo === primeiro || ativo === painel.current)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (ativo === ultimo || !painel.current.contains(ativo))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('keydown', tecla)
      if (origem?.isConnected) origem.focus()
    }
  }, [aberta])

  if (!montada) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={fechar}
        className={`absolute inset-0 cursor-default bg-[#11182766] ${
          aberta ? 'animate-fundo-entra' : 'animate-fundo-sai'
        }`}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[24px] bg-cartao px-5 pt-2 pb-[max(22px,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_#0002] focus:outline-none motion-reduce:animate-none ${
          aberta ? 'animate-gaveta-sobe' : 'animate-gaveta-desce'
        }`}
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-[3px] bg-[#D1D5DB]" />
        <h2 id={idTitulo} className="sr-only">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  )
}

/** Cabeçalho das gavetas: rótulo pequeno em caixa alta, nome em destaque e botão ✕. */
export function CabecalhoGaveta({
  rotulo,
  nome,
  onFechar,
  desativado = false,
}: {
  rotulo: string
  nome?: string
  onFechar(): void
  desativado?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
          {rotulo}
        </span>
        {nome && <span className="truncate text-[17px] font-bold">{nome}</span>}
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        disabled={desativado}
        className="flex size-toque shrink-0 items-center justify-center rounded-full bg-sutil text-base text-texto-2"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  )
}
