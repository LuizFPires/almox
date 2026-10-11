/** Normaliza para busca: minúsculas, sem acento, espaços simples (CLAUDE.md › Busca). */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** `alvo` contém `busca`, normalizando os dois lados. Busca vazia encontra tudo. */
export function contemTexto(alvo: string, busca: string): boolean {
  return normalizarTexto(alvo).includes(normalizarTexto(busca))
}
