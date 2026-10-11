'use client'

import { useRouter } from 'next/navigation'
import { Fragment, type ReactNode } from 'react'

/**
 * O Next guarda telas anteriores com o estado (Activity). Formulários de criação
 * precisam começar do zero a cada visita — sem a senha mostrada antes, sem o prefixo
 * da ferramenta anterior. bfcacheId muda a cada navegação nova (link, push), mas não
 * quando uma Server Action re-renderiza a página nem no voltar do navegador.
 */
export function NovaVisita({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter()
  return <Fragment key={bfcacheId}>{children}</Fragment>
}
