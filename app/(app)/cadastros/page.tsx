import type { Metadata } from 'next'
import { TelaEmBreve } from '@/components/TelaEmBreve'
import { podeCadastrar } from '@/lib/dominio/permissoes'

export const metadata: Metadata = { title: 'Cadastros · Almox' }

export default function Pagina() {
  return (
    <TelaEmBreve
      titulo="Cadastros"
      aba="cadastros"
      permitido={podeCadastrar}
      semAcesso="Só o engenheiro cadastra pessoas, empresas, ferramentas e valores."
    />
  )
}
