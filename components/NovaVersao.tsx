'use client'

import { useEffect, useState } from 'react'
import { recarregarApp } from '@/lib/atualizar-app'
import { precisaAtualizar, VERSAO_APP } from '@/lib/dominio/versao'

/** Com que frequência perguntar a versão ao servidor (além de ao abrir e ao voltar para a tela). */
export const INTERVALO_VERSAO_MS = 10 * 60_000

/**
 * Faixa "Tem uma versão nova do Almox" com o botão Atualizar. Quem fica dias com o app aberto
 * (almoxarife, PWA instalado) não percebe o deploy; esta faixa avisa e recarrega. Fica logo acima
 * da barra inferior, para não tapar a navegação.
 */
export function NovaVersao() {
  const [nova, setNova] = useState(false)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    if (!VERSAO_APP) return
    let vivo = true
    const conferir = async () => {
      if (!vivo || document.visibilityState === 'hidden' || !navigator.onLine) return
      try {
        const r = await fetch('/api/versao', { cache: 'no-store' })
        if (!r.ok) return
        const { versao } = (await r.json()) as { versao?: unknown }
        if (vivo && precisaAtualizar(VERSAO_APP, versao)) setNova(true)
      } catch {
        // sem rede: tenta na próxima
      }
    }
    void conferir()
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void conferir()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const intervalo = window.setInterval(conferir, INTERVALO_VERSAO_MS)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', aoVoltar)
      window.clearInterval(intervalo)
    }
  }, [])

  if (!nova) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 mx-auto flex w-full max-w-[480px] items-center gap-3 bg-escuro px-4 py-3 text-white shadow-lg"
    >
      <p className="flex-1 text-[15px] font-semibold">Tem uma versão nova do Almox.</p>
      <button
        type="button"
        onClick={() => {
          setAtualizando(true)
          void recarregarApp()
        }}
        disabled={atualizando}
        className="min-h-toque shrink-0 rounded-botao bg-amarelo px-4 font-bold text-texto disabled:bg-borda disabled:text-texto-2"
      >
        {atualizando ? 'Atualizando…' : 'Atualizar'}
      </button>
    </div>
  )
}
