import type { Metadata } from 'next'
import { TelaConectarTv } from '../TelaConectarTv'

export const metadata: Metadata = { title: 'Conectar TV · Almox' }

/** Aberta pelo QR da TV: o código vem no caminho (o login devolve para cá). */
export default async function PaginaConectarTvCodigo({
  params,
}: PageProps<'/conectar-tv/[codigo]'>) {
  const { codigo } = await params
  return <TelaConectarTv codigo={/^[0-9]{6}$/.test(codigo) ? codigo : undefined} />
}
