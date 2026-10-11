import Link from 'next/link'

// Ordem do PRD F-01: Início · Lista · Estoque · Fechamento · Cadastros.
const ITENS = [
  { chave: 'inicio', rotulo: 'Início', href: '/inicio', d: 'M3 10l9-6 9 6v10H3z', lanca: false },
  {
    chave: 'lista',
    rotulo: 'Lista',
    href: '/lista',
    d: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
    lanca: false,
  },
  {
    chave: 'estoque',
    rotulo: 'Estoque',
    href: '/estoque',
    d: 'M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10',
    lanca: false,
  },
  {
    chave: 'fechamento',
    rotulo: 'Fechamento',
    href: '/fechamento',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
    lanca: true,
  },
  {
    chave: 'cadastros',
    rotulo: 'Cadastros',
    href: '/cadastros',
    d: 'M6 11h12v10H6z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
    lanca: true,
  },
] as const

export type AbaInferior = (typeof ITENS)[number]['chave']

type Props = {
  ativa: AbaInferior
  /** Perfil consulta não vê Fechamento nem Cadastros. */
  podeLancar: boolean
}

export function BarraInferior({ ativa, podeLancar }: Props) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex h-[calc(76px+env(safe-area-inset-bottom))] border-t border-borda bg-cartao pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {ITENS.filter((item) => podeLancar || !item.lanca).map((item) => {
        const atual = item.chave === ativa
        return (
          <Link
            key={item.chave}
            href={item.href}
            aria-current={atual ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${atual ? 'font-bold text-texto' : 'text-texto-2'}`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.d} />
            </svg>
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
