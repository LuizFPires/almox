/** A API do Supabase devolve no máximo 1000 linhas por vez (`max_rows`). */
export const PAGINA = 1000

type Resposta<T> = { data: T[] | null; error: unknown }

/**
 * Busca todas as linhas, página por página, até vir uma página incompleta. A consulta precisa
 * de ordem estável (termine com `.order('id')` ou outra coluna única), senão linhas se repetem
 * ou somem entre as páginas.
 */
export async function buscarTodas<T>(
  pagina: (de: number, ate: number) => PromiseLike<Resposta<T>>,
  mensagemErro: string,
  maximo = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  const todas: T[] = []
  for (let de = 0; de < maximo; de += PAGINA) {
    const { data, error } = await pagina(de, Math.min(de + PAGINA, maximo) - 1)
    if (error || !data) throw new Error(mensagemErro)
    todas.push(...data)
    if (data.length < Math.min(PAGINA, maximo - de)) return todas
  }
  return todas
}
