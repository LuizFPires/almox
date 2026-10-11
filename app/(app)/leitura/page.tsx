import type { Metadata } from 'next'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { FluxoLeitura } from './FluxoLeitura'

export const metadata: Metadata = { title: 'Ler capacete · Almox' }

export default async function PaginaLeitura() {
  const { obraAtual } = await obterSessao()
  return <FluxoLeitura lanca={podeLancar(obraAtual.perfil)} />
}
