import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'

export const metadata: Metadata = { title: 'Cadastros · Almox' }

export default function Pagina() {
  return <TelaEmBreve titulo="Cadastros" aba="cadastros" />
}
