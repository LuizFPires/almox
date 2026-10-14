/**
 * Lançamento sem internet (M10): o celular guarda as pessoas e ferramentas da obra e uma fila
 * de lançamentos. Regras puras: o que está livre ou com cada pessoa contando a fila, e o que
 * fazer com a resposta do servidor ao enviar.
 */

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

/** O que o servidor manda para o celular (`dados_offline`). */
export type DadosOffline = {
  obra: string
  geradoEm: string
  pessoas: PessoaOffline[]
  tipos: TipoOffline[]
  posses: PosseOffline[]
}

export type ItemPedido = { tipo: string; quantidade: number }

export type ItemFila = {
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

/** Livres de cada tipo agora, descontando as retiradas da fila ainda não enviadas. */
export function livresComFila(tipos: TipoOffline[], fila: ItemFila[]): Record<string, number> {
  const livres: Record<string, number> = {}
  for (const t of tipos) livres[t.id] = t.livres
  for (const item of fila) {
    if (item.situacao !== 'aguardando') continue
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
):
  | { acao: 'enviado' }
  | { acao: 'tentarDepois'; contar: boolean }
  | { acao: 'recusado'; erro: string } {
  if (r.ok) return { acao: 'enviado' }
  const codigo = r.codigo ?? ''
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
    case 'AL012':
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
