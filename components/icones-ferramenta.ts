/**
 * Ícones de traço do protótipo (viewBox 24×24). A chave fica gravada em
 * `tipo_ferramenta.icone`; o nome é o padrão mostrado embaixo do ícone.
 */
export const ICONES_FERRAMENTA = {
  pa: { nome: 'Pá', d: 'M12 2v11 M9.5 2h5 M8 13h8v4a4 4 0 0 1-8 0z' },
  enxada: {
    nome: 'Enxada',
    d: 'M4 20L16 8 M13 4l7 7 M13 4c-1.6 1.8-1.8 3.4-.6 5 M20 11c-1.8 1.6-3.4 1.8-5 .6',
  },
  carrinho: {
    nome: 'Carrinho',
    d: 'M3 7h12l-2 6H6z M15 7l6-2 M11 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M7 13v3 M13 13l2 6',
  },
  colher: { nome: 'Colher', d: 'M12 3l6 7-6 5-6-5z M12 15v3 M10 18h4l-.5 3h-3z' },
  regua: { nome: 'Régua', d: 'M2 9h20v6H2z M6 9v3 M10 9v3 M14 9v3 M18 9v3' },
  linha: { nome: 'Linha', d: 'M12 2v7 M8 9h8l-4 11z' },
  furadeira: { nome: 'Furadeira', d: 'M4 6h12v6H4z M16 8h3 M19 9h3 M8 12l-1 8h4l1-8' },
  martelete: { nome: 'Martelete', d: 'M3 9h11v6H3z M14 11h4 M18 12h4 M6 15v5h4v-5 M5 9V7h4v2' },
  esmerilhadeira: {
    nome: 'Esmerilhadeira',
    d: 'M3 10h11v4H3z M14 12h2 M16 7v10 M16 7a5 5 0 0 1 0 10',
  },
  serra_circular: {
    nome: 'Serra circular',
    d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 3v2 M12 19v2 M3 12h2 M19 12h2',
  },
  martelo: { nome: 'Martelo', d: 'M14 3l6 6-3 3-6-6z M12.5 7.5L3 17l3 3 9.5-9.5' },
  escada: { nome: 'Escada', d: 'M7 2v20 M17 2v20 M7 6h10 M7 11h10 M7 16h10' },
  extensao: { nome: 'Extensão', d: 'M4 4h6v6H4z M6 2v2 M8 2v2 M7 10v5a5 5 0 0 0 5 5h8' },
} as const satisfies Record<string, { nome: string; d: string }>

export type ChaveIcone = keyof typeof ICONES_FERRAMENTA

export const CHAVES_ICONE = Object.keys(ICONES_FERRAMENTA) as ChaveIcone[]

export function ehChaveIcone(valor: string): valor is ChaveIcone {
  return Object.hasOwn(ICONES_FERRAMENTA, valor)
}
