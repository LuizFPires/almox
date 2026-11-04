import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { materialParaCadastro } from '@/lib/dados/materiais'
import { limiteDoAviso, textoAviso } from '@/lib/dominio/materiais'
import { obterSessao } from '@/lib/sessao'
import { FormMaterial } from '../FormMaterial'

export const metadata: Metadata = { title: 'Editar material · Almox' }

export default async function PaginaEditarMaterial({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const ficha = await materialParaCadastro(obraAtual.id, id)
  if (!ficha) notFound()
  const { material: m, ativo, temMovimentos } = ficha
  const aviso = limiteDoAviso(m) === null ? 'Sem aviso. Toque para configurar.' : textoAviso(m)

  return (
    <>
      <Cabecalho titulo={m.nome} subtitulo={obraAtual.nome} voltarPara="/cadastros/materiais" />
      <FormMaterial
        key={`${m.id}-${m.nome}-${m.unidade}`}
        material={{
          id: m.id,
          nome: m.nome,
          unidade: m.unidade,
          saldo: m.saldo,
          ativo,
          textoAviso: aviso,
        }}
        temMovimentos={temMovimentos}
      />
    </>
  )
}
