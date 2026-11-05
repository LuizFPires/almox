'use client'

import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { previaLancamento, type SaldoMaterial, type TipoLancamento } from '@/lib/dominio/materiais'
import { formatarHora } from '@/lib/formatos/datas'
import { formatarQuantidade, lerQuantidade, quantidadeValida } from '@/lib/formatos/quantidade'
import { Botao } from './Botao'

/** Dados extras que a edição devolve junto com a quantidade (sempre em valor absoluto). */
export type ExtraEdicao = { motivo?: string; negativo: boolean }

export type PropsGavetaQuantidade = {
  /** `edicao`: o engenheiro corrige um lançamento (valor absoluto; o sinal volta pelo chamador). */
  tipo: TipoLancamento | 'edicao'
  material: SaldoMaterial
  aberta: boolean
  /** Lançamento a caminho do servidor: trava os botões e não deixa fechar. */
  ocupado: boolean
  onFechar(): void
  /** Na edição recebe também o motivo e o sinal escolhido (`extra`). */
  onConfirmar(quantidade: number, extra?: ExtraEdicao): void
  /** Só edição: valor absoluto vigente do lançamento. */
  quantidadeInicial?: number
  /** Só edição: deixa escolher + ou − (ajuste). */
  escolheSinal?: boolean
  /** Só edição: o ajuste vigente é negativo. */
  negativoInicial?: boolean
  /** Só edição: apagar o lançamento (depois da confirmação dentro da gaveta). */
  onApagar?(motivo?: string): void
  /** Quem lança (aparece na conferência da entrada). */
  quem?: string
  /** Erro do servidor para mostrar dentro da gaveta. */
  erro?: string | null
  /**
   * Quantidade já enviada sem resposta (rede caiu): fica travada até o servidor responder,
   * para que repetir com a mesma chave não lance outro número.
   */
  quantidadeTravada?: number | null
  /** O usuário mexeu na quantidade (ex.: para limpar o erro anterior). */
  onAlterar?(): void
}

export const TEXTO_SEM_SINAL = 'Sem sinal. Toque de novo para enviar a mesma quantidade.'

const RAPIDOS = [10, 50, 100, 500] as const
const ROTULO: Record<TipoLancamento | 'edicao', string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  edicao: 'Editar lançamento',
}
const SELETOR_FOCAVEL =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
/** Igual à animação `gaveta-desce` em globals.css. */
const TEMPO_SAIDA_MS = 200

const arredondar = (x: number): number => Math.round(x * 100) / 100
const textoDe = (n: number): string => (n > 0 ? formatarQuantidade(n) : '')

/**
 * Gaveta que sobe de baixo para digitar ou ajustar a quantidade de um material (protótipo de
 * materiais › gavetaQtd/gavetaConf). Entrada passa por uma conferência; saída registra direto.
 * Foco preso; Esc, ✕ e toque no fundo fecham e devolvem o foco a quem abriu.
 */
export function GavetaQuantidade(props: PropsGavetaQuantidade) {
  const { tipo, material, aberta, ocupado, onFechar, onConfirmar, quem, erro, onAlterar } = props
  const edicao = tipo === 'edicao'
  const travada = props.quantidadeTravada ?? null
  const [montada, setMontada] = useState(aberta)
  const [anterior, setAnterior] = useState(aberta)
  const [texto, setTexto] = useState(
    props.quantidadeInicial !== undefined ? textoDe(props.quantidadeInicial) : '',
  )
  const [etapa, setEtapa] = useState<'quantidade' | 'conferencia'>('quantidade')
  const [hora, setHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [negativo, setNegativo] = useState(props.negativoInicial ?? false)
  const [apagando, setApagando] = useState(false)
  const painel = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const idDica = useId()

  // Cada abertura começa do zero (ajuste de estado durante a renderização, sem efeito).
  if (aberta !== anterior) {
    setAnterior(aberta)
    if (aberta) {
      setMontada(true)
      setTexto(props.quantidadeInicial !== undefined ? textoDe(props.quantidadeInicial) : '')
      setEtapa('quantidade')
      setMotivo('')
      setNegativo(props.negativoInicial ?? false)
      setApagando(false)
    }
  }

  // Fechou: deixa a animação de descida terminar antes de desmontar.
  useEffect(() => {
    if (aberta || !montada) return
    const t = setTimeout(() => setMontada(false), TEMPO_SAIDA_MS)
    return () => clearTimeout(t)
  }, [aberta, montada])

  const fechar = () => {
    if (!ocupado) onFechar()
  }
  const fecharPeloTeclado = useEffectEvent(fechar)

  useEffect(() => {
    if (!aberta) return
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null
    painel.current?.focus()
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

  // Na conferência da entrada, o foco vai direto para "Confirmar entrada".
  useEffect(() => {
    if (!aberta || etapa !== 'conferencia') return
    painel.current?.querySelector<HTMLElement>('[data-confirmar]')?.focus()
  }, [aberta, etapa])

  if (!montada) return null

  // Travada: mostra e envia a quantidade que já foi; o servidor decide (saldo pode ter mudado).
  const textoCampo = travada !== null ? textoDe(travada) : texto
  const q = travada ?? lerQuantidade(texto)
  const qtd = q ?? 0
  const previa = previaLancamento(edicao ? 'entrada' : tipo, material, qtd)
  const valida = q !== null && quantidadeValida(q, material.unidade)
  const pode =
    !ocupado && (travada !== null || (valida && q !== null && q > 0 && (edicao || !previa.excede)))
  const bloqueado = ocupado || travada !== null
  // Travada, o saldo pode já ter caído pela própria saída que talvez tenha entrado.
  const excedeMostrado = previa.excede && travada === null && !edicao
  const un = material.unidade

  function mudarTexto(novo: string) {
    setTexto(novo)
    onAlterar?.()
  }

  function ajustar(delta: number) {
    mudarTexto(textoDe(Math.max(0, arredondar((lerQuantidade(texto) ?? 0) + delta))))
  }

  function principal() {
    if (!pode || q === null) return
    if (edicao) {
      onConfirmar(q, { motivo: motivo.trim() || undefined, negativo })
      return
    }
    if (tipo === 'entrada') {
      setHora(formatarHora(new Date()))
      setEtapa('conferencia')
      return
    }
    onConfirmar(q)
  }

  let problema: string | null = null
  if (travada === null && texto.trim() !== '' && q === null) problema = 'Confira o número.'
  else if (travada === null && q !== null && q > 0 && !valida)
    problema = q > 999_999 ? 'Máximo 999.999.' : `Em ${un}, só número inteiro.`

  const cabecalho = (rotulo: string, nome?: string) => (
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
        onClick={fechar}
        disabled={ocupado}
        className="flex size-toque shrink-0 items-center justify-center rounded-full bg-sutil text-base text-texto-2"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  )

  const textoErro = travada !== null ? TEXTO_SEM_SINAL : erro
  const avisoErro = textoErro && (
    <p
      role="alert"
      className="rounded-xl bg-erro-claro px-3.5 py-2.5 text-sm font-semibold text-erro"
    >
      {textoErro}
    </p>
  )

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
          {etapa === 'conferencia' ? 'Conferir entrada' : ROTULO[tipo]}: {material.nome}
        </h2>

        {edicao && apagando ? (
          <>
            {cabecalho('Apagar lançamento', material.nome)}
            <p className="rounded-xl bg-erro-claro px-3.5 py-2.5 text-sm leading-snug font-semibold text-erro">
              Apagar este lançamento? O saldo volta a ficar como se ele nunca tivesse existido.
            </p>
            {avisoErro}
            <Botao
              variante="perigo"
              tamanho="g"
              larguraTotal
              disabled={ocupado}
              onClick={() => props.onApagar?.(motivo.trim() || undefined)}
            >
              {ocupado ? 'Apagando…' : 'Sim, apagar'}
            </Botao>
            <Botao
              variante="secundaria"
              tamanho="g"
              larguraTotal
              disabled={ocupado}
              onClick={() => setApagando(false)}
            >
              Não apagar
            </Botao>
          </>
        ) : etapa === 'conferencia' && q !== null && !edicao ? (
          <>
            {cabecalho('Conferir entrada')}
            <div className="rounded-cartao bg-sutil p-5 text-center">
              <div className="text-[40px] leading-[1.1] font-black text-sucesso">
                {`+${formatarQuantidade(q)} ${un}`}
              </div>
              <div className="mt-1 text-base font-semibold">{material.nome}</div>
              <div className="mt-1.5 text-[13px] text-texto-2">
                hoje {hora}
                {quem ? ` · ${quem}` : ''}
              </div>
            </div>
            {travada === null && (
              <p className="rounded-xl bg-sutil px-3.5 py-2.5 text-sm leading-snug">
                O saldo vai ficar em <b>{`${formatarQuantidade(previa.depois)} ${un}`}</b>.
              </p>
            )}
            {avisoErro}
            <Botao
              variante="sucesso"
              tamanho="g"
              larguraTotal
              disabled={ocupado}
              data-confirmar=""
              onClick={() => onConfirmar(q)}
            >
              {ocupado ? 'Registrando…' : 'Confirmar entrada'}
            </Botao>
            <Botao
              variante="secundaria"
              tamanho="g"
              larguraTotal
              disabled={bloqueado}
              onClick={() => setEtapa('quantidade')}
            >
              Corrigir
            </Botao>
          </>
        ) : (
          <>
            {cabecalho(ROTULO[tipo], material.nome)}
            <div className="flex items-center gap-2 rounded-cartao border border-borda bg-fundo p-2">
              <button
                type="button"
                aria-label="Menos um"
                onClick={() => ajustar(-1)}
                disabled={bloqueado}
                className="size-13 shrink-0 rounded-xl bg-sutil text-[26px] font-extrabold"
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label="Quantidade"
                aria-describedby={idDica}
                placeholder="0"
                value={textoCampo}
                disabled={bloqueado}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => mudarTexto(e.currentTarget.value)}
                onBlur={() => {
                  const n = lerQuantidade(texto)
                  if (n !== null) setTexto(textoDe(n))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                className="min-w-0 flex-1 cursor-text rounded-none border-0 border-b-2 border-dashed border-[#C3C8D0] bg-transparent py-0.5 text-center text-[36px] font-black tabular-nums focus:border-solid focus:border-foco focus:bg-[#F8FAFF]"
              />
              <span className="mr-1 text-[15px] font-bold text-texto-2">{un}</span>
              <button
                type="button"
                aria-label="Mais um"
                onClick={() => ajustar(1)}
                disabled={bloqueado}
                className="size-13 shrink-0 rounded-xl bg-sutil text-[26px] font-extrabold"
              >
                +
              </button>
            </div>
            <p id={idDica} className="-mt-1 text-center text-xs text-texto-2">
              Toque no número para digitar
            </p>
            <div className="flex gap-1.5">
              {RAPIDOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => ajustar(r)}
                  disabled={bloqueado}
                  className="min-h-toque flex-1 rounded-botao border border-borda bg-cartao font-bold"
                >
                  +{formatarQuantidade(r)}
                </button>
              ))}
            </div>
            {edicao && props.escolheSinal && (
              <div role="group" aria-label="Sinal do ajuste" className="flex gap-1.5">
                {([false, true] as const).map((neg) => (
                  <button
                    key={String(neg)}
                    type="button"
                    aria-pressed={negativo === neg}
                    disabled={bloqueado}
                    onClick={() => {
                      setNegativo(neg)
                      onAlterar?.()
                    }}
                    className={`min-h-toque flex-1 rounded-botao border text-lg font-extrabold ${
                      negativo === neg
                        ? 'border-escuro bg-escuro text-white'
                        : 'border-borda bg-cartao'
                    }`}
                  >
                    {neg ? '− Tirou' : '+ Pôs'}
                  </button>
                ))}
              </div>
            )}
            {edicao && (
              <label className="flex flex-col gap-1 text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
                Motivo (opcional)
                <input
                  type="text"
                  value={motivo}
                  maxLength={200}
                  disabled={ocupado}
                  onChange={(e) => setMotivo(e.currentTarget.value)}
                  className="min-h-toque rounded-botao border border-borda bg-fundo px-3 text-[15px] font-normal tracking-normal text-texto normal-case"
                />
              </label>
            )}
            <div
              aria-live="polite"
              className={`rounded-xl px-3.5 py-2.5 text-sm leading-[1.45] ${
                excedeMostrado ? 'bg-erro-claro text-erro' : 'bg-sutil'
              }`}
            >
              {travada !== null ? (
                <p>{`Quantidade enviada: ${formatarQuantidade(travada)} ${un}`}</p>
              ) : edicao ? (
                <p>O servidor confere se o saldo não fica negativo.</p>
              ) : excedeMostrado ? (
                <p className="font-bold">
                  {`Só tem ${formatarQuantidade(material.saldo)} ${un} no almox. Não dá para sair mais que o saldo.`}
                </p>
              ) : (
                <>
                  <p>
                    Saldo: {formatarQuantidade(material.saldo)} →{' '}
                    <b className={tipo === 'entrada' ? 'text-sucesso' : ''}>
                      {`${formatarQuantidade(previa.depois)} ${un}`}
                    </b>
                  </p>
                  {previa.cruzaLimite && previa.limite !== null && (
                    <p className="font-bold text-erro">
                      {`⚠ Fica abaixo do limite de ${formatarQuantidade(previa.limite)}. Todos da obra serão avisados.`}
                    </p>
                  )}
                  {problema && <p className="font-bold text-erro">{problema}</p>}
                </>
              )}
            </div>
            {avisoErro}
            <Botao
              variante={tipo === 'entrada' ? 'sucesso' : 'escura'}
              tamanho="g"
              larguraTotal
              disabled={!pode}
              onClick={principal}
            >
              {ocupado
                ? edicao
                  ? 'Salvando…'
                  : 'Registrando…'
                : edicao
                  ? 'Salvar'
                  : tipo === 'entrada'
                    ? 'Continuar'
                    : 'Registrar saída'}
            </Botao>
            {edicao && (
              <Botao
                variante="secundaria"
                tamanho="m"
                larguraTotal
                disabled={ocupado}
                className="text-erro"
                onClick={() => setApagando(true)}
              >
                Apagar lançamento
              </Botao>
            )}
          </>
        )}
      </div>
    </div>
  )
}
