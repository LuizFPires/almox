import type { Metadata } from 'next'
import { TelaConectarTv } from './TelaConectarTv'

export const metadata: Metadata = { title: 'Conectar TV · Almox' }

export default function PaginaConectarTv() {
  return <TelaConectarTv />
}
