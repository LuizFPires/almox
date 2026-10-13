/**
 * Adesivos dos capacetes em folha A4 (impressora comum): tamanhos, quantos cabem por folha e
 * a distribuição nas folhas, pulando os espaços já usados da primeira (folha aproveitada).
 * Área útil da A4 com margem de 10 mm: 190 × 277 mm.
 */
export const TAMANHOS_ADESIVO = {
  grande: { rotulo: 'Grande', larguraMm: 60, alturaMm: 80, colunas: 3, linhas: 3, vaoMm: 5 },
  medio: { rotulo: 'Médio', larguraMm: 50, alturaMm: 65, colunas: 3, linhas: 4, vaoMm: 5 },
  pequeno: { rotulo: 'Pequeno', larguraMm: 45, alturaMm: 60, colunas: 4, linhas: 4, vaoMm: 3 },
} as const

export type TamanhoAdesivo = keyof typeof TAMANHOS_ADESIVO

/** Médio por padrão (decisão de 13/10/2026): 12 por folha, sem perder o nome. */
export const TAMANHO_PADRAO: TamanhoAdesivo = 'medio'

/** Até quantos adesivos por impressão (cabe no tempo da página e na janela de impressão). */
export const LIMITE_ADESIVOS = 96

export function ehTamanho(valor: string | undefined | null): valor is TamanhoAdesivo {
  return typeof valor === 'string' && Object.hasOwn(TAMANHOS_ADESIVO, valor)
}

export function porFolha(tamanho: TamanhoAdesivo): number {
  const t = TAMANHOS_ADESIVO[tamanho]
  return t.colunas * t.linhas
}

/**
 * Espaços já usados da primeira folha ("0,1,2", contando do 0, da esquerda para a direita e de
 * cima para baixo). Ignora o que não existe no tamanho e deixa ao menos um espaço livre.
 */
export function lerPuladas(texto: string | undefined | null, tamanho: TamanhoAdesivo): number[] {
  const total = porFolha(tamanho)
  const puladas = [
    ...new Set(
      (texto ?? '')
        .split(',')
        .filter((x) => x.trim() !== '')
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < total),
    ),
  ].sort((a, b) => a - b)
  return puladas.length >= total ? puladas.slice(0, total - 1) : puladas
}

/** Um espaço da folha: o item impresso nele, já usado (pulado) ou vazio (sobra). */
export type Espaco<T> = { tipo: 'item'; item: T } | { tipo: 'usado' } | { tipo: 'vazio' }

/**
 * Distribui os itens nas folhas, na ordem: a primeira pula os espaços já usados; as seguintes
 * são folhas novas, cheias. Sem itens, devolve só a primeira folha (para montar).
 */
export function distribuirFolhas<T>(
  itens: readonly T[],
  tamanho: TamanhoAdesivo,
  puladas: readonly number[] = [],
): Espaco<T>[][] {
  const total = porFolha(tamanho)
  const usados = new Set(lerPuladas(puladas.join(','), tamanho))
  const folhas: Espaco<T>[][] = []
  let i = 0
  do {
    const primeira = folhas.length === 0
    const folha: Espaco<T>[] = []
    for (let espaco = 0; espaco < total; espaco++) {
      if (primeira && usados.has(espaco)) folha.push({ tipo: 'usado' })
      else if (i < itens.length) folha.push({ tipo: 'item', item: itens[i++]! })
      else folha.push({ tipo: 'vazio' })
    }
    folhas.push(folha)
  } while (i < itens.length)
  return folhas
}

/** "5 × 6,5 cm": tamanho de um adesivo, com vírgula decimal. */
export function medidaCm(tamanho: TamanhoAdesivo): string {
  const t = TAMANHOS_ADESIVO[tamanho]
  const cm = (mm: number) => String(mm / 10).replace('.', ',')
  return `${cm(t.larguraMm)} × ${cm(t.alturaMm)} cm`
}
