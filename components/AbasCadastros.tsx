'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { href: '/cadastros/pessoas', rotulo: 'Pessoas' },
  { href: '/cadastros/ferramentas', rotulo: 'Ferramentas' },
  { href: '/cadastros/materiais', rotulo: 'Materiais' },
  { href: '/cadastros/empresas', rotulo: 'Empresas' },
  { href: '/cadastros/usuarios', rotulo: 'Acessos' },
] as const

/** Seletor segmentado das listas de cadastro (protótipo › Cadastros). */
export function AbasCadastros() {
  const caminho = usePathname()
  return (
    <nav
      aria-label="Tipo de cadastro"
      className="flex gap-1 overflow-x-auto rounded-cartao bg-sutil p-1"
    >
      {ABAS.map((aba) => {
        const atual = caminho === aba.href
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={atual ? 'page' : undefined}
            className={`flex min-h-toque flex-1 shrink-0 items-center justify-center rounded-botao px-3 text-sm ${
              atual ? 'bg-cartao font-bold text-texto shadow-sm' : 'font-medium text-texto-2'
            }`}
          >
            {aba.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
