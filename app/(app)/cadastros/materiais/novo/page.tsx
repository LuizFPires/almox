import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { NovaVisita } from '@/components/NovaVisita'
import { obterSessao } from '@/lib/sessao'
import { FormMaterial } from '../FormMaterial'

export const metadata: Metadata = { title: 'Novo material · Almox' }

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function PaginaNovoMaterial({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string | string[]; nome?: string | string[] }>
}) {
  const { obraAtual } = await obterSessao()
  const q = await searchParams
  const id = primeiro(q.pedido)
  const pedido = id ? { id, nome: primeiro(q.nome) ?? '' } : undefined
  return (
    <>
      <Cabecalho
        titulo="Novo material"
        subtitulo={obraAtual.nome}
        voltarPara="/cadastros/materiais"
      />
      <NovaVisita>
        <FormMaterial pedido={pedido} />
      </NovaVisita>
    </>
  )
}
