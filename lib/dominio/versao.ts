/**
 * Versão do app que está rodando (gravada no build: commit do deploy na Vercel; local, a hora do
 * build). O servidor responde a dele em /api/versao; se for outra, há versão nova.
 */
export const VERSAO_APP = process.env.NEXT_PUBLIC_VERSAO_APP ?? ''

/** Só avisa com duas versões conhecidas e diferentes: resposta vazia ou errada não recarrega nada. */
export function precisaAtualizar(rodando: string, servidor: unknown): boolean {
  return typeof servidor === 'string' && servidor !== '' && rodando !== '' && servidor !== rodando
}
