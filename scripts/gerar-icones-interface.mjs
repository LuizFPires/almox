// Gera components/icones-interface.tsx a partir de design-system/icones/*.svg.
// Uso: node scripts/gerar-icones-interface.mjs (rode de novo quando o DS mudar).
import { readFileSync, writeFileSync } from 'node:fs'

const pasta = new URL('../design-system/icones/', import.meta.url)
const { icons } = JSON.parse(readFileSync(new URL('catalogo.json', pasta), 'utf8'))

const camel = (atributo) => atributo.replace(/-([a-z])/g, (_, l) => l.toUpperCase())

const linhas = icons.map((nome) => {
  const svg = readFileSync(new URL(`${nome}.svg`, pasta), 'utf8')
  const miolo = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1]
  if (!miolo) throw new Error(`SVG sem conteúdo: ${nome}`)
  const jsx = miolo.trim().replace(/\s([a-z]+-[a-z-]+)=/g, (_, a) => ` ${camel(a)}=`)
  return `  '${nome}': (\n    <>${jsx}</>\n  ),`
})

const saida = `// Gerado por scripts/gerar-icones-interface.mjs a partir do Almox Design System. Não edite à mão.
import type { ReactElement } from 'react'

const ICONES = {
${linhas.join('\n')}
} satisfies Record<string, ReactElement>

export type NomeIconeInterface = keyof typeof ICONES

type Props = {
  nome: NomeIconeInterface
  tamanho?: number
  className?: string
}

/** Ícone de interface do DS (grade 24, traço 1,75, cor do texto). Sempre decorativo. */
export function IconeInterface({ nome, tamanho = 24, className }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONES[nome]}
    </svg>
  )
}
`
writeFileSync(new URL('../components/IconeInterface.tsx', import.meta.url), saida)
console.log(`${icons.length} ícones`)
