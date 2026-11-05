/**
 * Lançamento sem internet (M10): o celular guarda as pessoas e ferramentas da obra e uma fila
 * de lançamentos. Regras puras: o que está livre ou com cada pessoa contando a fila, e o que
 * fazer com a resposta do servidor ao enviar. M13: entradas, saídas e contagens de material
 * também entram na fila.
 */

import type { ItemContagem } from './materiais'

export type PessoaOffline = {
  id: string
  nome: string
  nomeCapacete: string
  funcao: string
  empresa: string
  empresaCor: string
  /** false: inativa que ainda está com ferramenta (só devolve). Ausente em dados antigos. */
  ativa?: boolean
  /** SHA-256 (hex) do token do capacete; o token nunca vem do servidor. */
  hash: string
}

export type TipoOffline = {
  id: string
  nome: string
  icone: string
  altoValor: boolean
  livres: number
}

export type PosseOffline = {
  pessoa: string
  tipo: string
  via: 'qr' | 'manual'
  quantidade: number
  /** Quando a peça saiu (uma linha por peça). Ausente em dados antigos, agrupados por via. */
  desde?: string
}

/** Material ativo da obra, para a prévia do saldo sem internet. */
export type MaterialOffline = {
  id: string
  nome: string
  unidade: string
  saldo: number
  estoque_cheio: number
  aviso_tipo: 'quantidade' | 'percentual' | null
  aviso_valor: number | null
}

/** O que o servidor manda para o celular (`dados_offline`). */
export type DadosOffline = {
  obra: string
  geradoEm: string
  pessoas: PessoaOffline[]
  tipos: TipoOffline[]
  posses: PosseOffline[]
  /** Ausente em dados guardados antes do M13. */
  materiais?: MaterialOffline[]
}

export type ItemPedido = { tipo: string; quantidade: number }

export type ItemFilaFerramenta = {
  /** Chave do celular: o reenvio com a mesma chave não duplica (p_chave). */
  chave: string
  obra: string
  usuario: string
  tipo: 'retirada' | 'devolucao' | 'ocorrencia'
  pessoa: string
  /** Nome para mostrar na fila (sem precisar do cache). */
  pessoaNome: string
  /** Token lido no capacete (só até ser enviado); null = escolhida na lista (manual). */
  token: string | null
  itens: ItemPedido[]
  /** Hora do lançamento no celular (ISO). */
  quando: string
  situacao: 'aguardando' | 'recusado'
  erro?: string
  /** Respostas de erro do servidor (5xx) já recebidas; depois de 5, o item é recusado. */
  tentativas?: number
}

/** Entrada, saída ou contagem de material lançada sem resposta do servidor. */
export type ItemFilaMaterial = {
  /** A mesma chave da primeira tentativa: se ela chegou ao servidor, não duplica. */
  chave: string
  obra: string
  usuario: string
  tipo: 'material_entrada' | 'material_saida' | 'material_contagem'
  /** Entrada e saída. */
  material?: string
  materialNome?: string
  quantidade?: number
  /** Contagem. */
  modo?: 'ajustar' | 'conferir'
  itens?: ItemContagem[]
  quando: string
  situacao: 'aguardando' | 'recusado'
  erro?: string
  tentativas?: number
}

export type ItemFila = ItemFilaFerramenta | ItemFilaMaterial

export function ehItemDeMaterial(item: ItemFila): item is ItemFilaMaterial {
  return item.tipo.startsWith('material_')
}

/** Saldo do material agora, contando as entradas e saídas da fila ainda não enviadas. */
export function saldoComFila(saldo: number, fila: ItemFila[], materialId: string): number {
  let centesimos = Math.round(saldo * 100)
  for (const item of fila) {
    if (item.situacao !== 'aguardando' || !ehItemDeMaterial(item)) continue
    if (item.material !== materialId || item.quantidade === undefined) continue
    const q = Math.round(item.quantidade * 100)
    if (item.tipo === 'material_entrada') centesimos += q
    else if (item.tipo === 'material_saida') centesimos -= q
  }
  return Math.max(0, centesimos) / 100
}

/** Livres de cada tipo agora, descontando as retiradas da fila ainda não enviadas. */
export function livresComFila(tipos: TipoOffline[], fila: ItemFila[]): Record<string, number> {
  const livres: Record<string, number> = {}
  for (const t of tipos) livres[t.id] = t.livres
  for (const item of fila) {
    if (item.situacao !== 'aguardando' || ehItemDeMaterial(item)) continue
    const sinal = item.tipo === 'retirada' ? -1 : item.tipo === 'devolucao' ? 1 : 0
    for (const i of item.itens) {
      if (i.tipo in livres)
        livres[i.tipo] = Math.max(0, (livres[i.tipo] ?? 0) + sinal * i.quantidade)
    }
  }
  return livres
}

/**
 * O que a pessoa tem de cada tipo agora, contando a fila, com a mesma regra do servidor
 * (`registrar_devolucao`): as peças ficam na ordem em que saíram; devolução com QR leva as mais
 * antigas, seja qual for a via; sem QR, só as que saíram sem QR (RN-02), também das mais antigas.
 * `total` = quantas podem voltar com o QR; `semQr` = quantas podem voltar sem ele.
 */
export function possesComFila(
  dados: Pick<DadosOffline, 'posses'>,
  fila: ItemFila[],
  pessoa: string,
): Record<string, { total: number; semQr: number }> {
  // Peças de cada tipo com a hora de saída. O servidor grava a retirada da fila com a hora do
  // celular, então ela entra na ordem por essa hora (não sempre no fim).
  type Peca = { via: 'qr' | 'manual'; desde: number; ordem: number }
  const pecas: Record<string, Peca[]> = {}
  let ordem = 0
  const sair = (tipo: string, via: 'qr' | 'manual', n: number, desde: number) => {
    const lista = (pecas[tipo] ??= [])
    for (let k = 0; k < n; k++) lista.push({ via, desde, ordem: ordem++ })
    lista.sort((a, b) => a.desde - b.desde || a.ordem - b.ordem)
  }
  const voltar = (tipo: string, comQr: boolean, n: number) => {
    const lista = pecas[tipo] ?? []
    for (let k = 0; k < n; k++) {
      const i = comQr ? (lista.length > 0 ? 0 : -1) : lista.findIndex((p) => p.via === 'manual')
      if (i < 0) break
      lista.splice(i, 1)
    }
  }
  // Dados antigos do celular vêm agrupados e sem data: ficam na ordem recebida.
  const hora = (iso: string | undefined) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY)
  for (const p of dados.posses) {
    if (p.pessoa === pessoa) sair(p.tipo, p.via, p.quantidade, hora(p.desde))
  }
  const pendentes = fila
    .filter((i): i is ItemFilaFerramenta => !ehItemDeMaterial(i))
    .filter((i) => i.pessoa === pessoa && i.situacao === 'aguardando')
    .sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando))
  for (const item of pendentes) {
    for (const i of item.itens) {
      if (item.tipo === 'retirada')
        sair(i.tipo, item.token ? 'qr' : 'manual', i.quantidade, Date.parse(item.quando))
      else if (item.tipo === 'devolucao') voltar(i.tipo, item.token !== null, i.quantidade)
    }
  }
  const r: Record<string, { total: number; semQr: number }> = {}
  for (const [tipo, lista] of Object.entries(pecas)) {
    r[tipo] = { total: lista.length, semQr: lista.filter((p) => p.via === 'manual').length }
  }
  return r
}

/** Quantas de um tipo podem voltar nesta devolução (com QR: todas; sem QR: só as manuais). */
export function podeDevolver(posse: { total: number; semQr: number } | undefined, comQr: boolean) {
  if (!posse) return 0
  return comQr ? posse.total : posse.semQr
}

/** Normaliza o texto lido no QR como o servidor (`lower(trim(token))`) antes do SHA-256. */
export function normalizarToken(texto: string): string {
  return texto.trim().toLowerCase()
}

export type RespostaEnvio =
  { ok: true } | { ok: false; status?: number; codigo?: string; mensagem?: string }

export const MAX_TENTATIVAS_SERVIDOR = 5

/**
 * Depois de tentar enviar um item:
 * - `enviado`;
 * - `tentarDepois` (sem rede, sessão vencida, servidor ocupado ou fora): fica na fila; `contar`
 *   diz se foi erro do servidor (5xx), que depois de 5 vezes vira recusa (não trava a fila);
 * - `recusado` (o Almox respondeu que este lançamento não vale): o almoxarife vê o motivo.
 */
export function destinoDoEnvio(
  r: RespostaEnvio,
  tentativas = 0,
  /**
   * Material: duas chamadas com a mesma chave ao mesmo tempo podem dar `23505` na segunda.
   * A primeira gravou, então o item sai da fila.
   */
  { repetidoJaGravado = false }: { repetidoJaGravado?: boolean } = {},
):
  | { acao: 'enviado' }
  | { acao: 'tentarDepois'; contar: boolean }
  | { acao: 'recusado'; erro: string } {
  if (r.ok) return { acao: 'enviado' }
  const codigo = r.codigo ?? ''
  if (repetidoJaGravado && codigo === '23505') return { acao: 'enviado' }
  if (/^(AL\d{3}|22023|P0002|42501)$/.test(codigo)) {
    return { acao: 'recusado', erro: mensagemRecusa(codigo, r.mensagem) }
  }
  const status = r.status ?? 0
  // Sem resposta, sessão vencida, tempo esgotado, limite de pedidos: espera a rede/sessão.
  if (status === 0 || status === 401 || status === 408 || status === 429) {
    return { acao: 'tentarDepois', contar: false }
  }
  if (status >= 500 || ['40001', '40P01', '55P03', '57014'].includes(codigo)) {
    if (tentativas + 1 >= MAX_TENTATIVAS_SERVIDOR) {
      return {
        acao: 'recusado',
        erro: 'O Almox não conseguiu gravar este lançamento depois de várias tentativas. Nada foi registrado: lance de novo.',
      }
    }
    return { acao: 'tentarDepois', contar: true }
  }
  // Outra resposta 4xx: este pedido não vale (não trava os seguintes).
  return { acao: 'recusado', erro: mensagemRecusa(codigo, r.mensagem) }
}

function mensagemRecusa(codigo: string, mensagem?: string): string {
  switch (codigo) {
    case 'AL002':
      return `${mensagem ?? 'A ferramenta acabou.'} Nada foi registrado: confira com a pessoa e lance de novo.`
    case 'AL101':
      return 'Saldo insuficiente quando sincronizou. A saída não foi registrada.'
    case 'AL103':
      return 'Material desativado.'
    case 'AL012':
    case 'AL107':
      return 'Ficou mais de 24 h sem enviar (ou o relógio do celular está errado). Nada foi registrado: lance de novo.'
    case 'AL013':
      return 'O QR lido não é o capacete desta pessoa. Nada foi registrado.'
    case '42501':
      return 'Este login não lança nesta obra. Nada foi registrado.'
    default:
      return `${mensagem ?? 'O Almox recusou o lançamento.'} Nada foi registrado.`
  }
}

/** Texto curto do selo da fila no Início e na tela sem internet. */
export function textoFila(aguardando: number, recusados: number): string | null {
  const partes: string[] = []
  if (aguardando > 0) partes.push(`${aguardando} aguardando envio`)
  if (recusados > 0) partes.push(`${recusados} não ${recusados === 1 ? 'enviado' : 'enviados'}`)
  return partes.length ? partes.join(' · ') : null
}
