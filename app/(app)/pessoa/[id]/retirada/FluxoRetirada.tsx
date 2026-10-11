'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoPessoaLancamento } from '@/components/CartaoPessoaLancamento'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { RodapeAcao } from '@/components/RodapeAcao'
import type { TextoIdentificacao } from '@/lib/dominio/ficha'
import {
  AVISO_SEM_QR,
  previaCodigos,
  resumoEscolhas,
  somarUm,
  textoConfirmacao,
  textoContinuar,
  textoDisponivel,
  type TipoParaRetirar,
} from '@/lib/dominio/retirada'
import { registrarRetirada, type FalhaRetirada } from './acoes'

type Props = {
  pessoa: { id: string; nome: string; primeiro: string; iniciais: string }
  identificacao: TextoIdentificacao
  /** Id da conferência do capacete; null = retirada manual. */
  conferencia: string | null
  tipos: TipoParaRetirar[]
  /** "Martelete MT-01 desde ontem 16:40" — avisos de pendência (decisão do M5). */
  pendencias: string[]
  voltarParaFicha: string
}

const SELO_SAIDA = (
  <span className="rounded-full bg-amarelo px-3 py-1 text-xs font-bold tracking-wide text-texto">
    SAÍDA
  </span>
)

/** Retirada (F-05): grade de tipos (toque soma 1) → revisão com confirmação → concluir. */
export function FluxoRetirada(props: Props) {
  const { pessoa, identificacao, conferencia, tipos, pendencias, voltarParaFicha } = props
  const router = useRouter()
  const [etapa, setEtapa] = useState<'grade' | 'revisao'>('grade')
  const [qtd, setQtd] = useState<Record<string, number>>({})
  const [conferido, setConferido] = useState(false)
  const [chave, setChave] = useState('')
  const [falha, setFalha] = useState<FalhaRetirada | null>(null)
  const [enviando, iniciar] = useTransition()

  const escolhas = tipos.map((tipo) => ({ tipo, quantidade: qtd[tipo.id] ?? 0 }))
  const marcadas = escolhas.filter((e) => e.quantidade > 0)
  const total = marcadas.reduce((s, e) => s + e.quantidade, 0)
  const temAlto = marcadas.some((e) => e.tipo.altoValor)
  const manual = conferencia === null

  function concluir() {
    setFalha(null)
    iniciar(async () => {
      try {
        const r = await registrarRetirada({
          pessoaId: pessoa.id,
          identificacao: conferencia,
          itens: marcadas.map((e) => ({ tipo: e.tipo.id, quantidade: e.quantidade })),
          confirmado: conferido,
          chave,
        })
        setFalha(r)
        // Alguém levou antes: atualiza as livres e volta para a grade.
        if (r.motivo === 'acabou') {
          setEtapa('grade')
          setQtd({})
          setChave('')
          router.refresh()
        }
      } catch (e) {
        const digest = (e as { digest?: unknown } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw e
        // Pode ter gravado antes de a rede cair: repetir com a mesma chave não duplica.
        setFalha({
          erro: 'Não deu para confirmar com o Almox. Toque em "Concluir retirada" de novo: se já tiver sido registrada, não repete.',
          motivo: 'outro',
        })
      }
    })
  }

  const avisoFalha = falha && (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-cartao bg-erro-claro px-4 py-3 text-erro"
    >
      <p className="font-semibold">{falha.erro}</p>
      {falha.motivo === 'conferencia' && (
        <Link href="/leitura" className="font-bold underline">
          Ler o capacete do {pessoa.primeiro}
        </Link>
      )}
    </div>
  )

  if (etapa === 'revisao') {
    return (
      <>
        <Cabecalho
          titulo="Retirada"
          subtitulo="Revisar e concluir"
          selo={SELO_SAIDA}
          aoVoltar={() => setEtapa('grade')}
        />
        <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
          <CartaoPessoaLancamento pessoa={pessoa} identificacao={identificacao} />
          <div className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao px-4 py-1">
            {marcadas.map(({ tipo, quantidade }) => (
              <div key={tipo.id} className="flex items-center gap-3 py-3">
                {ehChaveIcone(tipo.icone) && (
                  <IconeFerramenta icone={tipo.icone} nome={tipo.nome} tamanho="p" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-sm">
                    {previaCodigos(tipo.livres, quantidade).join(', ')}
                  </span>
                  {tipo.altoValor && (
                    <span className="text-xs font-bold text-erro">ALTO VALOR</span>
                  )}
                </span>
                <span className="text-2xl font-bold tabular-nums">×{quantidade}</span>
              </div>
            ))}
          </div>
          {pendencias.length > 0 && (
            <div className="rounded-cartao bg-aviso-claro px-4 py-3 text-aviso">
              <p className="font-bold">Ainda está com ferramenta de outro dia:</p>
              <ul className="list-disc pl-5 text-[15px]">
                {pendencias.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {manual && (
            <p className="rounded-cartao bg-erro-claro px-4 py-3 text-[15px] text-erro">
              <b>Lançamento sem QR.</b> {AVISO_SEM_QR}
            </p>
          )}
          <button
            type="button"
            role="checkbox"
            aria-checked={conferido}
            onClick={() => setConferido((c) => !c)}
            className={`flex min-h-16 items-center gap-3 rounded-cartao border-2 px-4 py-3 text-left text-[15px] font-semibold ${
              conferido ? 'border-escuro bg-cartao' : 'border-borda bg-cartao'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-botao border-2 text-lg font-bold ${
                conferido ? 'border-escuro bg-escuro text-amarelo' : 'border-borda'
              }`}
            >
              {conferido ? '✓' : ''}
            </span>
            {textoConfirmacao(pessoa.primeiro, temAlto)}
          </button>
          {avisoFalha}
        </main>
        <RodapeAcao
          resumo={
            <span className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 font-normal text-texto-2">Identificação</span>
              <span>{manual ? 'manual · sem QR' : 'QR do capacete'}</span>
            </span>
          }
        >
          <Botao
            type="button"
            tamanho="g"
            larguraTotal
            disabled={!conferido || enviando}
            onClick={concluir}
          >
            {enviando
              ? 'Registrando…'
              : conferido
                ? 'Concluir retirada'
                : 'Marque a conferência acima'}
          </Botao>
        </RodapeAcao>
      </>
    )
  }

  return (
    <>
      <Cabecalho
        titulo="Retirada"
        subtitulo="O que vai levar"
        selo={SELO_SAIDA}
        voltarPara={voltarParaFicha}
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
        <CartaoPessoaLancamento pessoa={pessoa} identificacao={identificacao} />
        {avisoFalha}
        <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
          CADA TOQUE NO ÍCONE SOMA 1
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {tipos.map((tipo) => {
            const q = qtd[tipo.id] ?? 0
            const livres = tipo.livres.length
            return (
              <div key={tipo.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`${tipo.nome}: ${q > 0 ? `${q} escolhida(s), ` : ''}${textoDisponivel(livres, q)}`}
                  onClick={() => setQtd((m) => ({ ...m, [tipo.id]: somarUm(q, livres) }))}
                  disabled={livres === 0}
                  className={`relative flex min-h-32 flex-col items-center justify-center gap-1 rounded-cartao border-2 px-1 py-3 disabled:opacity-40 ${
                    q > 0 ? 'border-amarelo bg-aviso-claro' : 'border-transparent bg-cartao'
                  }`}
                >
                  {q > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-escuro text-sm font-bold text-amarelo">
                      {q}
                    </span>
                  )}
                  {ehChaveIcone(tipo.icone) && (
                    <IconeFerramenta icone={tipo.icone} nome={tipo.nome} destaque={q > 0} />
                  )}
                  <span className="text-xs text-texto-2">
                    {q > 0 && q === livres ? 'todas escolhidas' : textoDisponivel(livres, q)}
                  </span>
                </button>
                {q > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Tirar uma ${tipo.nome}`}
                      onClick={() => setQtd((m) => ({ ...m, [tipo.id]: q - 1 }))}
                      className="min-h-toque w-11 shrink-0 rounded-botao border border-borda bg-cartao text-xl font-bold"
                    >
                      −
                    </button>
                    <span className="text-[11px] leading-tight text-texto-2">
                      toque no ícone: +1
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <RodapeAcao
        resumo={
          <span className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 font-normal text-texto-2">Selecionados</span>
            <span className="truncate">{resumoEscolhas(escolhas)}</span>
          </span>
        }
      >
        <Botao
          type="button"
          tamanho="g"
          larguraTotal
          disabled={total === 0}
          onClick={() => {
            setConferido(false)
            setFalha(null)
            setChave(crypto.randomUUID())
            setEtapa('revisao')
          }}
        >
          {textoContinuar(total)}
        </Botao>
      </RodapeAcao>
    </>
  )
}
