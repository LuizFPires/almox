import { lerBRL } from '@/lib/formatos/moeda'
import { normalizarTexto } from '@/lib/formatos/texto'

/** Regras puras dos cadastros do engenheiro (M2). O banco repete as que importam. */

export const FUNCOES_SUGERIDAS = [
  'Pedreiro',
  'Servente',
  'Meio-oficial',
  'Carpinteiro',
  'Armador',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Ajudante',
  'Mestre de obras',
] as const

/** Cores das empresas no painel da TV, na ordem de cadastro. */
export const CORES_EMPRESA = [
  '#F4B400',
  '#4C8DFF',
  '#FF8A3D',
  '#9A6BFF',
  '#3DC9B0',
  '#E86FA8',
  '#7CB342',
  '#00ACC1',
] as const

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function limpar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

/** Nome completo: pelo menos nome e sobrenome. Devolve a mensagem de erro ou null. */
export function validarNomeCompleto(nome: string): string | null {
  const partes = limpar(nome)
    .split(' ')
    .filter((p) => /\p{L}{2,}/u.test(p))
  if (partes.length < 2) return 'Informe nome e sobrenome.'
  return null
}

export function validarEmail(email: string, obrigatorio = false): string | null {
  const limpo = email.trim()
  if (!limpo) return obrigatorio ? 'Informe o e-mail.' : null
  return EMAIL.test(limpo) ? null : 'E-mail inválido.'
}

/** Nome no capacete: maiúsculas, espaços simples, até 16 caracteres. */
export function normalizarNomeCapacete(texto: string): string {
  return limpar(texto).toLocaleUpperCase('pt-BR').slice(0, 16)
}

/**
 * Sugere o nome no capacete a partir do nome completo: o primeiro nome. Se já houver
 * esse nome na obra, sugere com a inicial do último sobrenome ("JOÃO S.").
 */
export function sugerirNomeCapacete(nomeCompleto: string, usados: readonly string[] = []) {
  const partes = limpar(nomeCompleto).split(' ').filter(Boolean)
  const primeiro = normalizarNomeCapacete(partes[0] ?? '')
  const ocupados = new Set(usados.map((n) => normalizarTexto(n)))
  if (!primeiro || !ocupados.has(normalizarTexto(primeiro))) return primeiro
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : ''
  return ultimo ? normalizarNomeCapacete(`${primeiro} ${ultimo[0]}.`) : primeiro
}

/** Outro capacete da obra já usa este nome? (só aviso, não bloqueia) */
export function capaceteRepetido(nome: string, usados: readonly string[]): boolean {
  const alvo = normalizarTexto(nome)
  return Boolean(alvo) && usados.some((u) => normalizarTexto(u) === alvo)
}

/** Valor de reposição digitado em reais → centavos (> 0), ou mensagem de erro. */
export function lerValorReposicao(texto: string): { centavos: number } | { erro: string } {
  const centavos = lerBRL(texto)
  if (centavos === null) return { erro: 'Valor inválido. Use o formato 2.890,00.' }
  if (centavos <= 0) return { erro: 'O valor precisa ser maior que zero.' }
  return { centavos }
}

/** Prefixo do código das unidades: 2–3 letras do nome, sem acento, sem colidir com os usados. */
export function sugerirPrefixo(nome: string, usados: readonly string[] = []): string {
  const letras = normalizarTexto(nome)
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
  const palavras = letras.split(' ').filter(Boolean)
  const ocupados = new Set(usados)
  const candidatos = [
    (palavras[0] ?? '').slice(0, 3),
    ((palavras[0] ?? '').slice(0, 2) + (palavras[1] ?? '').slice(0, 1)).slice(0, 3),
    (palavras[0] ?? '').slice(0, 4),
  ].filter((c) => /^[A-Z]{2,4}$/.test(c))
  for (const c of candidatos) if (!ocupados.has(c)) return c
  const base = candidatos[0] ?? 'FER'
  for (const letra of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const c = (base.slice(0, 2) + letra).slice(0, 3)
    if (!ocupados.has(c)) return c
  }
  return base
}

export function validarPrefixo(prefixo: string): string | null {
  return /^[A-Z]{2,4}$/.test(prefixo) ? null : 'Use de 2 a 4 letras maiúsculas.'
}

/** Prévia dos códigos que a RPC vai gerar ("MT-04 a MT-08"). */
export function previaCodigos(
  prefixo: string,
  codigosExistentes: readonly string[],
  quantidade: number,
) {
  if (quantidade <= 0) return ''
  const ultimo = codigosExistentes.reduce((max, c) => {
    const n = Number(/-(\d+)$/.exec(c)?.[1] ?? 0)
    return c.startsWith(`${prefixo}-`) && n > max ? n : max
  }, 0)
  const codigo = (n: number) => `${prefixo}-${String(n).padStart(2, '0')}`
  return quantidade === 1
    ? codigo(ultimo + 1)
    : `${codigo(ultimo + 1)} a ${codigo(ultimo + quantidade)}`
}

/** Próxima cor livre para uma empresa nova. */
export function proximaCor(usadas: readonly string[]): string {
  const ocupadas = new Set(usadas.map((c) => c.toUpperCase()))
  return (
    CORES_EMPRESA.find((c) => !ocupadas.has(c)) ??
    CORES_EMPRESA[usadas.length % CORES_EMPRESA.length]!
  )
}
