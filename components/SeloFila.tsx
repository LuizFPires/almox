'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { textoFila } from '@/lib/dominio/offline'
import { CANAL_FILA, listarFila } from '@/lib/offline/banco'

/**
 * Selo "N aguardando envio" (PRD §231) com atalho para a tela sem internet, onde se vê cada
 * lançamento da fila. Também aparece sem internet, para lançar mesmo assim.
 */
export function SeloFila({ lanca }: { lanca: boolean }) {
  const [contagem, setContagem] = useState({ aguardando: 0, recusados: 0 })
  const [semRede, setSemRede] = useState(false)

  useEffect(() => {
    let vivo = true
    const ler = () =>
      void listarFila()
        .then((fila) => {
          if (!vivo) return
          setContagem({
            aguardando: fila.filter((i) => i.situacao === 'aguardando').length,
            recusados: fila.filter((i) => i.situacao === 'recusado').length,
          })
        })
        .catch(() => undefined)
    const rede = () => setSemRede(!navigator.onLine)
    ler()
    rede()
    let canal: BroadcastChannel | null = null
    try {
      canal = new BroadcastChannel(CANAL_FILA)
      canal.onmessage = ler
    } catch {
      canal = null
    }
    const t = window.setInterval(ler, 10_000)
    window.addEventListener('online', rede)
    window.addEventListener('offline', rede)
    return () => {
      vivo = false
      canal?.close()
      window.clearInterval(t)
      window.removeEventListener('online', rede)
      window.removeEventListener('offline', rede)
    }
  }, [])

  const texto = textoFila(contagem.aguardando, contagem.recusados)
  if (!texto && !(semRede && lanca)) return null
  return (
    <Link
      href="/campo"
      className={`flex min-h-toque items-center justify-between gap-3 rounded-cartao px-4 py-3 text-[15px] font-bold ${
        contagem.recusados > 0 ? 'bg-erro-claro text-erro' : 'bg-aviso-claro text-aviso'
      }`}
    >
      <span>{texto ?? 'Sem internet'}</span>
      <span className="underline">{texto ? 'Ver fila' : 'Lançar sem internet'}</span>
    </Link>
  )
}
