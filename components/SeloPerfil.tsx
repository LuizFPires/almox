import Link from 'next/link'
import { IconeInterface } from '@/components/IconeInterface'
import { rotuloPerfil, type Perfil } from '@/lib/dominio/permissoes'

const CORES: Record<Perfil, string> = {
  engenheiro: 'bg-engenheiro-claro text-engenheiro',
  almoxarife: 'bg-aviso-claro text-aviso',
  consulta: 'bg-sutil text-texto-3',
}

/** Perfil do usuário na obra; leva à tela de conta (trocar obra, sair). */
export function SeloPerfil({ perfil, empresa }: { perfil: Perfil; empresa?: string | null }) {
  const rotulo = rotuloPerfil(perfil, empresa)
  return (
    <Link
      href="/conta"
      aria-label={`Minha conta e obra: ${rotulo}`}
      title="Minha conta e obra"
      className={`flex min-h-toque min-w-toque shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-escuro ${CORES[perfil]}`}
    >
      <IconeInterface nome="user" />
    </Link>
  )
}
