import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { exigirAdministrador } from '@/lib/administracao'
import { FormObra } from '../FormObra'

export const metadata: Metadata = { title: 'Nova obra · Almox' }

export default async function PaginaNovaObra() {
  await exigirAdministrador()
  return (
    <>
      <Cabecalho titulo="Nova obra" voltarPara="/administracao" />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <FormObra />
        <p className="text-sm text-texto-2">
          Depois de criar, ligue o engenheiro da obra. Ele dá os demais acessos.
        </p>
      </main>
    </>
  )
}
