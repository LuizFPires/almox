import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'

export const metadata: Metadata = { title: 'Fechamento · Almox' }

export default function Pagina() {
  return <TelaEmBreve titulo="Fechamento" aba="fechamento" />
}
