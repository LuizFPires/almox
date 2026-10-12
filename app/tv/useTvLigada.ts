'use client'

import { useEffect } from 'react'
import { msAteRecarga } from '@/lib/dominio/tv'

/**
 * A TV roda dias seguidos: pede para a tela não apagar (Wake Lock, de novo sempre que a aba
 * volta a ficar visível) e recarrega sozinha às 04:00 (decisão do M8), o que zera qualquer
 * acúmulo do navegador. Tudo é desfeito ao desmontar.
 */
export function useTvLigada() {
  useEffect(() => {
    let trava: WakeLockSentinel | null = null
    let encerrado = false

    const pedirTela = async () => {
      if (encerrado || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      if (trava && !trava.released) return // já está pedida
      try {
        trava = await navigator.wakeLock.request('screen')
        if (encerrado) void trava.release()
      } catch {
        // Sem permissão (ex.: economia de energia): o mini PC fica sem descanso de tela.
      }
    }
    const aoMudarVisibilidade = () => void pedirTela()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    void pedirTela()

    const recarga = setTimeout(() => window.location.reload(), msAteRecarga(new Date()))

    return () => {
      encerrado = true
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      clearTimeout(recarga)
      if (trava) void trava.release()
    }
  }, [])
}
