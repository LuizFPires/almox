import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'
import { podeLancar } from '@/lib/dominio/permissoes'

export const metadata: Metadata = { title: 'Fechamento · Almox' }

export default function Pagina() {
  return (
    <TelaEmBreve
      titulo="Fechamento"
      aba="fechamento"
      permitido={podeLancar}
      semAcesso="O fechamento do dia é feito pelo almoxarife ou pelo engenheiro."
    />
  )
}
