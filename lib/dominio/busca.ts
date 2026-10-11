import { contemTexto } from '@/lib/formatos/texto'

export type PessoaBuscavel = { nome: string; nome_capacete: string }

/** Lista manual (F-08): busca pelo nome ou pelo nome no capacete, sem diferenciar acentos. */
export function filtrarPessoas<T extends PessoaBuscavel>(pessoas: T[], busca: string): T[] {
  if (!busca.trim()) return pessoas
  return pessoas.filter((p) => contemTexto(p.nome, busca) || contemTexto(p.nome_capacete, busca))
}
