'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * As folhas vão direto para o `<body>` (fora da coluna de celular do app): na impressão, a
 * página esconde tudo o que não é `#folhas-a4` sem precisar de `:has()` (navegadores antigos).
 */
export function FolhasA4({ children }: { children: ReactNode }) {
  const [corpo, setCorpo] = useState<HTMLElement | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o portal só existe no navegador
  useEffect(() => setCorpo(document.body), [])
  if (!corpo) return null
  return createPortal(
    <div id="folhas-a4" className="hidden print:block">
      {children}
    </div>,
    corpo,
  )
}
