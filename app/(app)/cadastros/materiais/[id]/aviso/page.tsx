import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { materialParaCadastro } from '@/lib/dados/materiais'
import { obterSessao } from '@/lib/sessao'
import { FormAviso } from './FormAviso'

export const metadata: Metadata = { title: 'Aviso de limite · Almox' }

export default async function PaginaAviso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const ficha = await materialParaCadastro(obraAtual.id, id)
  if (!ficha) notFound()
  const { material: m } = ficha

  return (
    <>
      <Cabecalho
        titulo={`Aviso · ${m.nome}`}
        subtitulo={obraAtual.nome}
        voltarPara={`/cadastros/materiais/${m.id}`}
      />
      <FormAviso
        key={`${m.id}-${m.aviso?.tipo ?? '-'}-${m.aviso?.valor ?? 0}`}
        materialId={m.id}
        unidade={m.unidade}
        estoqueCheio={m.estoqueCheio}
        aviso={m.aviso}
        obraNome={obraAtual.nome}
      />
    </>
  )
}
