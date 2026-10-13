import { normalizarTexto } from '@/lib/formatos/texto'

export type TipoCadastro = 'pessoa' | 'ferramenta' | 'empresa'

/** Uma linha do índice da busca de Cadastros (montado no servidor, filtrado no celular). */
export type ItemBusca = {
  tipo: TipoCadastro
  id: string
  nome: string
  /** Linha de baixo (ex.: "ZÉ CARLOS · Pedreiro · Construtora"). */
  detalhe: string
  /** Outros textos que também acham o item (capacete, matrícula, empresa…). */
  termos: string[]
  /** Pessoa inativa, por exemplo: aparece por último. */
  inativo?: boolean
  /** Ferramenta: chave ou arquivo do ícone. */
  icone?: string
  /** Empresa: cor da bolinha (pessoa: cor da empresa). */
  cor?: string
}

export type ResultadoBusca = { tipo: TipoCadastro; titulo: string; itens: ItemBusca[] }[]

const GRUPOS: { tipo: TipoCadastro; titulo: string }[] = [
  { tipo: 'pessoa', titulo: 'Pessoas' },
  { tipo: 'ferramenta', titulo: 'Ferramentas' },
  { tipo: 'empresa', titulo: 'Empresas' },
]

/** Até quantos itens por grupo (o resto pede para refinar a busca). */
export const LIMITE_POR_GRUPO = 30

/**
 * Busca em todos os cadastros de uma vez: cada palavra digitada precisa aparecer no nome ou
 * em algum termo, sem acento e sem diferença de maiúsculas. Ativos antes, depois por nome.
 */
export function buscarCadastros(indice: readonly ItemBusca[], termo: string): ResultadoBusca {
  const palavras = normalizarTexto(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return []
  const achados = indice.filter((item) => {
    const texto = normalizarTexto([item.nome, item.detalhe, ...item.termos].join(' '))
    return palavras.every((p) => texto.includes(p))
  })
  return GRUPOS.map(({ tipo, titulo }) => ({
    tipo,
    titulo,
    itens: achados
      .filter((i) => i.tipo === tipo)
      .sort(
        (a, b) =>
          Number(a.inativo ?? false) - Number(b.inativo ?? false) ||
          a.nome.localeCompare(b.nome, 'pt-BR'),
      ),
  })).filter((g) => g.itens.length > 0)
}

/** Endereço do cadastro de cada item. */
export function hrefCadastro(item: Pick<ItemBusca, 'tipo' | 'id'>): string {
  return `/cadastros/${item.tipo}/${item.id}`
}
