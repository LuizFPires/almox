/**
 * Ícones de traço (viewBox 24×24), no estilo do protótipo. A chave fica gravada em
 * `tipo_ferramenta.icone` (a mesma lista está na constraint do banco); o nome é o padrão
 * mostrado embaixo do ícone; o grupo organiza a grade do cadastro.
 */
export const GRUPOS_ICONE = {
  manual: 'Manuais',
  eletrica: 'Elétricas e máquinas',
  apoio: 'Acesso, transporte e apoio',
} as const

export type GrupoIcone = keyof typeof GRUPOS_ICONE

export const ICONES_FERRAMENTA = {
  // Manuais
  pa: { nome: 'Pá', grupo: 'manual', d: 'M12 2v11 M9.5 2h5 M8 13h8v4a4 4 0 0 1-8 0z' },
  enxada: {
    nome: 'Enxada',
    grupo: 'manual',
    d: 'M4 20L16 8 M13 4l7 7 M13 4c-1.6 1.8-1.8 3.4-.6 5 M20 11c-1.8 1.6-3.4 1.8-5 .6',
  },
  picareta: { nome: 'Picareta', grupo: 'manual', d: 'M3 9c4.5-4.5 13.5-4.5 18 0 M12 6.3V21' },
  cavadeira: {
    nome: 'Cavadeira',
    grupo: 'manual',
    d: 'M9 2v11 M15 2v11 M8 13h3v2c0 3-1 5-2 6 M16 13h-3v2c0 3 1 5 2 6',
  },
  alavanca: {
    nome: 'Alavanca',
    grupo: 'manual',
    d: 'M14 3c1.7 0 3 1.3 3 3 M14 3v15a3 3 0 0 1-6 0 M8 18l-2 1',
  },
  marreta: { nome: 'Marreta', grupo: 'manual', d: 'M4 4h12v6H4z M10 10v11 M16 6h2v2h-2' },
  martelo: {
    nome: 'Martelo',
    grupo: 'manual',
    d: 'M14 3l6 6-3 3-6-6z M12.5 7.5L3 17l3 3 9.5-9.5',
  },
  martelo_borracha: {
    nome: 'Martelo de borracha',
    grupo: 'manual',
    d: 'M7 3h8a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z M11 10v11',
  },
  talhadeira: { nome: 'Talhadeira', grupo: 'manual', d: 'M10 2h4v13l-2 7-2-7z M10 6h4' },
  serrote: {
    nome: 'Serrote',
    grupo: 'manual',
    d: 'M15 4h5v6h-5z M15 7L3 17l2 3 10-8 M6 16.5l1 1.5 M9 14l1 1.5 M12 11.5l1 1.5',
  },
  arco_serra: {
    nome: 'Arco de serra',
    grupo: 'manual',
    d: 'M4 15V5h16v10 M3 15h18 M20 15l1 6h-3l-1-6',
  },
  colher: {
    nome: 'Colher',
    grupo: 'manual',
    d: 'M12 3l6 7-6 5-6-5z M12 15v3 M10 18h4l-.5 3h-3z',
  },
  desempenadeira: {
    nome: 'Desempenadeira',
    grupo: 'manual',
    d: 'M3 14h18v4H3z M8 14v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3',
  },
  espatula: { nome: 'Espátula', grupo: 'manual', d: 'M10.5 2h3v8h-3z M8.5 10h7l2.5 10H6z' },
  pincel: {
    nome: 'Trincha',
    grupo: 'manual',
    d: 'M10 2h4v8h-4z M8 10h8v3H8z M8 13h8l-.5 8h-7z M11 16v5 M13 16v5',
  },
  rolo_pintura: {
    nome: 'Rolo de pintura',
    grupo: 'manual',
    d: 'M4 3h13v5H4z M17 5.5h3v5h-8.5v3 M10.5 13.5h2v8h-2z',
  },
  regua: { nome: 'Régua', grupo: 'manual', d: 'M2 9h20v6H2z M6 9v3 M10 9v3 M14 9v3 M18 9v3' },
  nivel: { nome: 'Nível', grupo: 'manual', d: 'M2 9h20v6H2z M9 10.5h6v3H9z M12 10.5v3' },
  esquadro: { nome: 'Esquadro', grupo: 'manual', d: 'M4 3v18h17z M8 11v6h6z' },
  trena: {
    nome: 'Trena',
    grupo: 'manual',
    d: 'M3 5h10a6 6 0 0 1 0 12H3z M7 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M13 17h8v2',
  },
  linha: { nome: 'Linha', grupo: 'manual', d: 'M12 2v7 M8 9h8l-4 11z' },
  peneira: {
    nome: 'Peneira',
    grupo: 'manual',
    d: 'M3 9h18v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z M8 9v9 M12 9v9 M16 9v9 M3 13.5h18',
  },
  rastelo: {
    nome: 'Rastelo',
    grupo: 'manual',
    d: 'M12 2v13 M4 15h16 M4 15v5 M8 15v5 M12 15v5 M16 15v5 M20 15v5',
  },
  vassoura: {
    nome: 'Vassoura',
    grupo: 'manual',
    d: 'M12 2v11 M8 13h8l2.5 8h-13z M10 16.5l-.5 4.5 M14 16.5l.5 4.5 M12 16.5V21',
  },
  rodo: { nome: 'Rodo', grupo: 'manual', d: 'M12 3v13 M3 16h18v3H3z' },
  alicate: {
    nome: 'Alicate',
    grupo: 'manual',
    d: 'M10 2l1.5 8 M14 2l-1.5 8 M11 11a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11.3 12L8 22 M12.7 12L16 22',
  },
  torques: {
    nome: 'Torquês',
    grupo: 'manual',
    d: 'M8 2c0 4 1.5 6.5 4 8 M16 2c0 4-1.5 6.5-4 8 M12 10L8 22 M12 10l4 12',
  },
  tesoura: {
    nome: 'Tesoura',
    grupo: 'manual',
    d: 'M3 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.5 8L21 18 M8.5 16L21 6',
  },
  chave_fenda: {
    nome: 'Chave de fenda',
    grupo: 'manual',
    d: 'M11 2h2 M12 2v8 M9.5 10h5v11h-5z',
  },
  chave_boca: {
    nome: 'Chave inglesa',
    grupo: 'manual',
    d: 'M14.5 3a5 5 0 0 0-4.6 6.9L3 16.8 7.2 21l6.9-6.9A5 5 0 0 0 21 9.5l-3.2 3.2-3.5-1-1-3.5L16.5 5',
  },
  chave_grifo: {
    nome: 'Chave grifo',
    grupo: 'manual',
    d: 'M6 3h8v3H6z M6 6v4h5 M11 6v15 M14 4.5h3',
  },
  estilete: {
    nome: 'Estilete',
    grupo: 'manual',
    d: 'M4 20l2.5-.5L18 8l-2-2L4.5 17.5z M16 6l3-3 2 2-3 3',
  },
  cortador_piso: {
    nome: 'Cortador de piso',
    grupo: 'manual',
    d: 'M2 17h20v3H2z M4 14h16 M4 14v3 M20 14v3 M13 14l3-8h4',
  },
  // Elétricas e máquinas
  furadeira: {
    nome: 'Furadeira',
    grupo: 'eletrica',
    d: 'M4 6h12v6H4z M16 8h3 M19 9h3 M8 12l-1 8h4l1-8',
  },
  parafusadeira: {
    nome: 'Parafusadeira',
    grupo: 'eletrica',
    d: 'M4 5h11v5H4z M15 7.5h5 M7 10l-1 7h5l1-7 M5 17h7v4H5z',
  },
  martelete: {
    nome: 'Martelete',
    grupo: 'eletrica',
    d: 'M3 9h11v6H3z M14 11h4 M18 12h4 M6 15v5h4v-5 M5 9V7h4v2',
  },
  rompedor: {
    nome: 'Rompedor',
    grupo: 'eletrica',
    d: 'M8 2h8v4H8z M4 4h4 M16 4h4 M9 6h6v9H9z M11 15h2v5l-1 2-1-2z',
  },
  esmerilhadeira: {
    nome: 'Esmerilhadeira',
    grupo: 'eletrica',
    d: 'M3 10h11v4H3z M14 12h2 M16 7v10 M16 7a5 5 0 0 1 0 10',
  },
  serra_circular: {
    nome: 'Serra circular',
    grupo: 'eletrica',
    d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 3v2 M12 19v2 M3 12h2 M19 12h2',
  },
  serra_marmore: {
    nome: 'Serra mármore',
    grupo: 'eletrica',
    d: 'M2 10h9v4H2z M11 12h2 M13 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M18 9V7',
  },
  serra_tico_tico: {
    nome: 'Serra tico-tico',
    grupo: 'eletrica',
    d: 'M4 13h16v-3l-3-5H9L4 9z M8 9h6 M12 13v8',
  },
  serra_bancada: {
    nome: 'Serra de bancada',
    grupo: 'eletrica',
    d: 'M2 13h20v3H2z M5 16v5 M19 16v5 M8 13a4 4 0 0 1 8 0',
  },
  policorte: {
    nome: 'Policorte',
    grupo: 'eletrica',
    d: 'M3 20h18 M5 20v-3h14v3 M6 17l7-8 M9 9a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  },
  lixadeira: {
    nome: 'Lixadeira',
    grupo: 'eletrica',
    d: 'M3 16h18v4H3z M6 16v-4a6 6 0 0 1 12 0v4 M10 6h4',
  },
  plaina: { nome: 'Plaina', grupo: 'eletrica', d: 'M3 15h18v3H3z M5 15l2-6h9l3 6 M9 9V6h6v3' },
  tupia: { nome: 'Tupia', grupo: 'eletrica', d: 'M8 2h8v11H8z M5 13h14v3H5z M12 16v5' },
  soprador: {
    nome: 'Soprador térmico',
    grupo: 'eletrica',
    d: 'M3 6h12a4 4 0 0 1 0 8H3z M6 14l-1 7h4l1-7 M19 10h3',
  },
  misturador: {
    nome: 'Misturador',
    grupo: 'eletrica',
    d: 'M6 2h9v5H6z M10.5 7v9 M7 16h7l-1 5H8z M8 18.5h5',
  },
  betoneira: {
    nome: 'Betoneira',
    grupo: 'eletrica',
    d: 'M5 5l10-3 4 8-10 3z M8 13l-3 8 M15 11l2 10 M3 21h18',
  },
  vibrador: {
    nome: 'Vibrador de concreto',
    grupo: 'eletrica',
    d: 'M3 3h7v6H3z M10 6c5 0 6 3 6 6v3 M14.5 15h3v7h-3z',
  },
  compactador: {
    nome: 'Compactador',
    grupo: 'eletrica',
    d: 'M9 2h6 M12 2v5 M7 7h10v7H7z M5 14h14v3H5z M7 17v4h10v-4',
  },
  placa_vibratoria: {
    nome: 'Placa vibratória',
    grupo: 'eletrica',
    d: 'M3 17h18v3H3z M6 17v-5h9v5 M15 12l4-8 M17 4h4',
  },
  gerador: {
    nome: 'Gerador',
    grupo: 'eletrica',
    d: 'M3 6h18v13H3z M6 19v2 M18 19v2 M13 8.5l-3 4.5h4l-3 4.5',
  },
  compressor: {
    nome: 'Compressor',
    grupo: 'eletrica',
    d: 'M3 14a4 4 0 0 1 4-4h10a4 4 0 0 1 0 8H7a4 4 0 0 1-4-4z M8 10V6h6v4 M14 7h4 M6 18v3 M18 18v3',
  },
  lavadora: {
    nome: 'Lavadora de pressão',
    grupo: 'eletrica',
    d: 'M3 8h8v11H3z M5 19v2 M9 19v2 M11 12h4l3-3h4 M15 12v3',
  },
  solda: {
    nome: 'Máquina de solda',
    grupo: 'eletrica',
    d: 'M3 8h10v11H3z M6 12h4 M6 15h4 M13 13h3l5-6 M19 5l3 3',
  },
  bomba: {
    nome: 'Bomba d’água',
    grupo: 'eletrica',
    d: 'M8 3h8v13H8z M9 16h6l-1 4h-4z M12 3V1 M16 7h3a2 2 0 0 1 2 2v3',
  },
  aspirador: {
    nome: 'Aspirador',
    grupo: 'eletrica',
    d: 'M4 9h11a4 4 0 0 1 4 4v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M15 9V5h5 M20 5l1 2 M7 19v2 M15 19v2',
  },
  nivel_laser: {
    nome: 'Nível a laser',
    grupo: 'eletrica',
    d: 'M9 3h6v5H9z M15 5.5h7 M12 8v5 M12 13l-5 8 M12 13l5 8 M12 13v8',
  },
  refletor: {
    nome: 'Refletor',
    grupo: 'eletrica',
    d: 'M4 4h16v10H4z M8 9h8 M8 14l-2 7 M16 14l2 7 M5 21h14',
  },
  extensao: {
    nome: 'Extensão',
    grupo: 'eletrica',
    d: 'M4 4h6v6H4z M6 2v2 M8 2v2 M7 10v5a5 5 0 0 0 5 5h8',
  },
  // Acesso, transporte e apoio
  escada: { nome: 'Escada', grupo: 'apoio', d: 'M7 2v20 M17 2v20 M7 6h10 M7 11h10 M7 16h10' },
  andaime: {
    nome: 'Andaime',
    grupo: 'apoio',
    d: 'M5 2v20 M19 2v20 M5 8h14 M5 15h14 M5 8l14 7 M3 22h4 M17 22h4',
  },
  cavalete: { nome: 'Cavalete', grupo: 'apoio', d: 'M3 7h18v2H3z M6 9L4 21 M18 9l2 12 M7.5 15h9' },
  carrinho: {
    nome: 'Carrinho',
    grupo: 'apoio',
    d: 'M3 7h12l-2 6H6z M15 7l6-2 M11 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M7 13v3 M13 13l2 6',
  },
  balde: { nome: 'Balde', grupo: 'apoio', d: 'M5 8h14l-2 13H7z M6 8c0-5 12-5 12 0' },
  mangueira: {
    nome: 'Mangueira',
    grupo: 'apoio',
    d: 'M12 5a7 7 0 1 0 7 7 M12 9a3 3 0 1 0 3 3 M19 12h3 M12 5V2',
  },
  lanterna: { nome: 'Lanterna', grupo: 'apoio', d: 'M7 3h10l-2 5H9z M9 8h6v13H9z M12 12v3' },
  cone: { nome: 'Cone', grupo: 'apoio', d: 'M10 3h4l5 16H5z M8.5 9h7 M7 14h10 M3 19h18v2H3z' },
} as const satisfies Record<string, { nome: string; grupo: GrupoIcone; d: string }>

export type ChaveIcone = keyof typeof ICONES_FERRAMENTA

export const CHAVES_ICONE = Object.keys(ICONES_FERRAMENTA) as ChaveIcone[]

export function ehChaveIcone(valor: string): valor is ChaveIcone {
  return Object.hasOwn(ICONES_FERRAMENTA, valor)
}

/** Ícone enviado pelo engenheiro: "arquivo:{obra}/{uuid}.png" no bucket público "icones". */
export type IconeArquivo = `arquivo:${string}`

/** O que fica em `tipo_ferramenta.icone`: chave do Almox ou ícone próprio da obra. */
export type Icone = ChaveIcone | IconeArquivo

const ARQUIVO = /^arquivo:[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/

export function ehIconeArquivo(valor: string): valor is IconeArquivo {
  return ARQUIVO.test(valor)
}

export function ehIcone(valor: string): valor is Icone {
  return ehChaveIcone(valor) || ehIconeArquivo(valor)
}

/** Endereço público da imagem de um ícone próprio. */
export function urlIconeArquivo(icone: IconeArquivo): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  return `${base}/storage/v1/object/public/icones/${icone.slice('arquivo:'.length)}`
}
