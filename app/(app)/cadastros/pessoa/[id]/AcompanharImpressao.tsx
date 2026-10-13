'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { situacaoTrabalhos } from '../acoes'

type Props = {
  /** Trabalhos mostrados na tela, com a situação de agora. */
  trabalhos: { id: string; status: string }[]
  segundos?: number
  /** Depois disso para (tela esquecida aberta não fica consultando o banco). */
  minutos?: number
}

/**
 * Acompanha a impressão do adesivo consultando só a situação dos trabalhos; a página (pessoa,
 * empresas, adesivo) só recarrega quando alguma situação muda. Para com a aba escondida.
 */
export function AcompanharImpressao({ trabalhos, segundos = 3, minutos = 10 }: Props) {
  const router = useRouter()
  const chave = trabalhos.map((t) => `${t.id}:${t.status}`).join(',')

  useEffect(() => {
    const atual = new Map(chave.split(',').map((par) => par.split(':') as [string, string]))
    const fim = Date.now() + minutos * 60_000
    let consultando = false
    const intervalo = setInterval(async () => {
      if (Date.now() > fim) return clearInterval(intervalo)
      if (document.visibilityState !== 'visible' || consultando) return
      consultando = true
      try {
        const agora = await situacaoTrabalhos([...atual.keys()])
        if (agora.some((t) => atual.get(t.id) !== t.status)) {
          clearInterval(intervalo)
          router.refresh()
        }
      } catch {
        // Sem rede: tenta de novo na próxima volta.
      } finally {
        consultando = false
      }
    }, segundos * 1000)
    return () => clearInterval(intervalo)
  }, [chave, router, segundos, minutos])
  return null
}
