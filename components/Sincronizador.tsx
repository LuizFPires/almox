'use client'

import { useEffect } from 'react'
import { apagarDadosDeOutros, CANAL_FILA } from '@/lib/offline/banco'
import { atualizarDados, enviarFila, usuarioAtual } from '@/lib/offline/sincronizar'

const ENVIAR_MS = 30_000
const DADOS_MS = 5 * 60_000

/**
 * Em toda tela do app: manda a fila de lançamentos feitos sem internet quando a rede volta e,
 * para quem lança, mantém no celular os dados para lançar sem internet (pessoas com o hash do
 * token, ferramentas e posses) e a tela /campo guardada pelo service worker.
 */
export function Sincronizador({ obra, lanca }: { obra: string; lanca: boolean }) {
  useEffect(() => {
    let vivo = true
    const enviar = () => {
      if (vivo && navigator.onLine) void enviarFila().catch(() => undefined)
    }
    const baixar = () => {
      if (vivo && lanca && navigator.onLine) void atualizarDados(obra).catch(() => undefined)
    }
    // Outro login neste celular: os dados guardados do anterior saem (não abrem no /campo).
    void usuarioAtual()
      .then((u) => (u ? apagarDadosDeOutros(u) : undefined))
      .catch(() => undefined)
    enviar()
    baixar()
    if (lanca) {
      // A tela sem internet (com o leitor de QR) fica guardada para quando a rede cair.
      void navigator.serviceWorker?.ready
        .then((r) => r.active?.postMessage({ tipo: 'guardar-campo' }))
        .catch(() => undefined)
    }
    const aoVoltar = () => {
      enviar()
      baixar()
    }
    window.addEventListener('online', aoVoltar)
    const tEnviar = window.setInterval(enviar, ENVIAR_MS)
    const tDados = window.setInterval(baixar, DADOS_MS)
    let canal: BroadcastChannel | null = null
    try {
      canal = new BroadcastChannel(CANAL_FILA)
      canal.onmessage = enviar
    } catch {
      canal = null
    }
    return () => {
      vivo = false
      window.removeEventListener('online', aoVoltar)
      window.clearInterval(tEnviar)
      window.clearInterval(tDados)
      canal?.close()
    }
  }, [obra, lanca])
  return null
}
