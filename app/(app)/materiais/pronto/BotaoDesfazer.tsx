'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { desfazerSaida } from '../acoes'

type Props = {
  movimentoId: string
  /** Prazo que sobra para desfazer, pelo relógio do servidor. */
  restanteMs: number
}

const segundos = (ms: number): number => Math.max(0, Math.ceil(ms / 1000))

/** "Desfazer (60 s)" com contagem regressiva; ao zerar, "Desfazer expirou". */
export function BotaoDesfazer({ movimentoId, restanteMs }: Props) {
  const router = useRouter()
  const [restante, setRestante] = useState(() => segundos(restanteMs))
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState(false)
  const [enviando, iniciar] = useTransition()

  useEffect(() => {
    // Relógio monotônico do aparelho a partir do prazo do servidor (aba em segundo plano não atrasa).
    const fim = performance.now() + restanteMs
    const passo = () => setRestante(segundos(fim - performance.now()))
    const t = setInterval(passo, 1000)
    return () => clearInterval(t)
  }, [restanteMs])

  function desfazer() {
    setErro(null)
    iniciar(async () => {
      try {
        const r = await desfazerSaida(movimentoId)
        if (!r.ok) {
          setErro(r.erro)
          return
        }
        setFeito(true)
        router.refresh()
      } catch (e) {
        const digest = (e as { digest?: unknown } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw e
        setErro('Sem conexão. Tente de novo.')
      }
    })
  }

  if (feito) {
    return (
      <p
        role="status"
        className="rounded-xl bg-sutil px-3.5 py-3 text-center text-sm font-semibold"
      >
        Saída desfeita. Fica no extrato como estorno.
      </p>
    )
  }

  const expirou = restante <= 0
  return (
    <>
      <Botao
        variante="secundaria"
        tamanho="g"
        larguraTotal
        disabled={expirou || enviando}
        onClick={desfazer}
      >
        {expirou ? 'Desfazer expirou' : enviando ? 'Desfazendo…' : `Desfazer (${restante} s)`}
      </Botao>
      {erro && (
        <p role="alert" className="text-center text-sm font-semibold text-erro">
          {erro}
        </p>
      )}
    </>
  )
}
