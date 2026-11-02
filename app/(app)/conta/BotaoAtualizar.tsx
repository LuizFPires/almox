'use client'

import { useState } from 'react'
import { recarregarApp } from '@/lib/atualizar-app'
import { VERSAO_APP } from '@/lib/dominio/versao'

/** Recarrega o app na versão mais nova, com a versão em uso escrita embaixo. */
export function BotaoAtualizar() {
  const [atualizando, setAtualizando] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        setAtualizando(true)
        void recarregarApp()
      }}
      disabled={atualizando}
      className="flex min-h-toque w-full flex-col items-center justify-center rounded-botao border border-borda bg-cartao py-2 font-semibold disabled:text-texto-2"
    >
      <span>{atualizando ? 'Atualizando…' : 'Atualizar o app'}</span>
      {VERSAO_APP && (
        <span className="text-[13px] font-normal text-texto-2">Versão em uso: {VERSAO_APP}</span>
      )}
    </button>
  )
}
