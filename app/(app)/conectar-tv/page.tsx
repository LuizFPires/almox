import type { Metadata } from 'next'
import { TelaConectarTv } from './TelaConectarTv'

export const metadata: Metadata = { title: 'Conectar TV · Almox' }

export default async function PaginaConectarTv({ searchParams }: PageProps<'/conectar-tv'>) {
  const { erro } = (await searchParams) as { erro?: string }
  return <TelaConectarTv erroDesconectar={erro === 'desconectar'} />
}
