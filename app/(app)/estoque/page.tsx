import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'

export const metadata: Metadata = { title: 'Estoque · Almox' }

export default function Pagina() {
  return <TelaEmBreve titulo="Estoque" aba="estoque" />
}
