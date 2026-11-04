'use client'

import { usePathname } from 'next/navigation'
import { BarraInferior } from './BarraInferior'

/** Barra inferior das listas de Cadastros: a aba Materiais usa a barra do modo Materiais. */
export function BarraCadastros() {
  const caminho = usePathname()
  if (caminho.startsWith('/cadastros/materiais')) {
    return <BarraInferior modo="materiais" ativa="cadastros-materiais" podeLancar />
  }
  return <BarraInferior ativa="cadastros" podeLancar />
}
