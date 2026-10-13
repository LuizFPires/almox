import Link from 'next/link'
import { IconeInterface } from './IconeInterface'
import { ItemBarraInferior } from './ItemBarraInferior'

// Ordem do PRD F-01: Início · Lista · Estoque · Fechamento · Cadastros.
const ITENS = [
  { chave: 'inicio', rotulo: 'Início', href: '/inicio', icone: 'dashboard', lanca: false },
  {
    chave: 'lista',
    rotulo: 'Lista',
    href: '/lista',
    icone: 'users',
    lanca: false,
  },
  {
    chave: 'estoque',
    rotulo: 'Estoque',
    href: '/estoque',
    icone: 'box',
    lanca: false,
  },
  {
    chave: 'fechamento',
    rotulo: 'Fechamento',
    href: '/fechamento',
    icone: 'clock',
    lanca: true,
  },
  {
    chave: 'cadastros',
    rotulo: 'Cadastros',
    href: '/cadastros',
    icone: 'lock',
    lanca: true,
  },
] as const

export type AbaInferior = (typeof ITENS)[number]['chave']

type Props = {
  ativa: AbaInferior
  /** Perfil consulta não vê Fechamento nem Cadastros. */
  podeLancar: boolean
}

/** Presa ao pé da tela (sticky): não some ao rolar listas compridas. */
export function BarraInferior({ ativa, podeLancar }: Props) {
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-20 mt-auto flex h-[calc(76px+env(safe-area-inset-bottom))] shrink-0 border-t border-borda bg-cartao pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {ITENS.filter((item) => podeLancar || !item.lanca).map((item) => {
        const atual = item.chave === ativa
        return (
          <Link
            key={item.chave}
            href={item.href}
            aria-current={atual ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center text-xs"
          >
            <ItemBarraInferior
              atual={atual}
              icone={<IconeInterface nome={item.icone} />}
              rotulo={item.rotulo}
            />
          </Link>
        )
      })}
    </nav>
  )
}
