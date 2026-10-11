import Link from 'next/link'
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
      aria-label={`${rotulo}: conta e obra`}
      className={`flex min-h-toque max-w-[45%] shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${CORES[perfil]}`}
    >
      <span className="truncate">{rotulo}</span>
    </Link>
  )
}
