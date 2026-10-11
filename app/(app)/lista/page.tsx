import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'

export const metadata: Metadata = { title: 'Lista · Almox' }

export default function Pagina() {
  return <TelaEmBreve titulo="Lista" aba="lista" />
}
