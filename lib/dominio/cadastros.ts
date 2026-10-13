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
 * Enquanto digita: maiúsculas sem tirar o espaço do fim (senão "ZÉ CARLOS" vira
 * "ZÉCARLOS" letra a letra). O trim final fica para normalizarNomeCapacete, ao salvar.
 */
export function digitarNomeCapacete(texto: string): string {
  return texto
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .toLocaleUpperCase('pt-BR')
    .slice(0, 16)
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

/**
 * Sugestão de prefixo do código das unidades: 2–4 letras do nome, sem acento, sem colidir com os
 * usados que a tela conhece. O banco (`salvar_ferramenta`) confere de novo e troca se já estiver em
 * uso, com trava por obra; a importação também confere antes de gravar.
 */
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

/** Empreiteira sem e-mail do dono ou do encarregado: o aviso não chega a todos (RN-13). */
export function faltaEmail(empresa: {
  tipo: 'propria' | 'empreiteira'
  dono_email: string | null
  encarregado_email: string | null
}): boolean {
  return empresa.tipo === 'empreiteira' && (!empresa.dono_email || !empresa.encarregado_email)
}

/** Nome de cada cor do painel (lido pelo leitor de tela no lugar do código hex). */
export const NOMES_CORES: Record<(typeof CORES_EMPRESA)[number], string> = {
  '#F4B400': 'amarelo',
  '#4C8DFF': 'azul',
  '#FF8A3D': 'laranja',
  '#9A6BFF': 'roxo',
  '#3DC9B0': 'verde-água',
  '#E86FA8': 'rosa',
  '#7CB342': 'verde',
  '#00ACC1': 'azul-petróleo',
}

/** Data `yyyy-MM-dd` que existe no calendário (2026-02-31 não passa). */
export function dataValida(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (!m) return false
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  )
}

/** Ordena códigos de unidade pelo número (FUR-99 antes de FUR-100). */
export function compararCodigos(a: string, b: string): number {
  const [pa, na] = [a.replace(/-\d+$/, ''), Number(/-(\d+)$/.exec(a)?.[1] ?? 0)]
  const [pb, nb] = [b.replace(/-\d+$/, ''), Number(/-(\d+)$/.exec(b)?.[1] ?? 0)]
  return pa === pb ? na - nb : pa.localeCompare(pb)
}
