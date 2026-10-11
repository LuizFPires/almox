import { diaDaObra, formatarDataHora, formatarHora } from '@/lib/formatos/datas'

/** O agente consulta a fila a cada 2 s; sem sinal há mais de 30 s = offline. */
export const LIMITE_ONLINE_MS = 30_000

export function agenteOnline(ultimoPing: string | null, agora: Date): boolean {
  if (!ultimoPing) return false
  return agora.getTime() - new Date(ultimoPing).getTime() < LIMITE_ONLINE_MS
}

export type SituacaoAgente = { online: boolean; texto: string }

/** Situação do agente para a tela (o mais recente entre os dispositivos ativos). */
export function situacaoAgente(pings: (string | null)[], agora: Date): SituacaoAgente {
  const ultimo = pings
    .filter((p): p is string => Boolean(p))
    .sort()
    .at(-1)
  if (!ultimo) return { online: false, texto: 'Agente nunca conectou. Instale no mini PC.' }
  if (agenteOnline(ultimo, agora)) return { online: true, texto: 'Agente online' }
  const quando =
    diaDaObra(ultimo) === diaDaObra(agora) ? formatarHora(ultimo) : formatarDataHora(ultimo)
  return { online: false, texto: `Agente offline desde ${quando}` }
}

type Status = 'pendente' | 'enviando' | 'enviado' | 'erro'

/** Frase do trabalho de impressão para quem está esperando o adesivo sair. */
export function descreverTrabalho(
  status: Status,
  erro: string | null,
  agenteLigado: boolean,
): string {
  switch (status) {
    case 'enviado':
      return 'Impresso no almoxarifado'
    case 'enviando':
      return 'Enviando para a impressora…'
    case 'erro':
      return `Impressora sem resposta: ${erro ?? 'falha ao imprimir'}`
    case 'pendente':
      return agenteLigado
        ? 'Na fila, saindo em instantes'
        : 'Na fila: o agente de impressão está desligado. Imprime assim que ele voltar.'
  }
}

/**
 * IPv4 da rede da obra: 10.x, 172.16–31.x, 192.168.x (ou 127.x, o próprio mini PC).
 * O banco confere a mesma regra; o agente também (a impressora nunca vai para a internet).
 */
export function validarIp(ip: string): string | null {
  const partes = ip.trim().split('.')
  const ok = partes.length === 4 && partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  if (!ok) return 'IP inválido. Ex.: 192.168.0.50'
  const [a, b] = partes.map(Number) as [number, number]
  const local =
    a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  return local ? null : 'Use o IP da impressora na rede da obra (ex.: 192.168.0.50).'
}

/** Porta RAW das impressoras de etiqueta (normalmente 9100). */
export function validarPorta(porta: number): string | null {
  return Number.isInteger(porta) && porta >= 9100 && porta <= 9199
    ? null
    : 'Porta inválida: use a porta de impressão (normalmente 9100).'
}

/** Cópias do adesivo pedidas na tela: inteiro de 1 a 5, senão null. */
export function lerCopias(valor: string): number | null {
  if (!/^\d$/.test(valor.trim())) return null
  const n = Number(valor)
  return n >= 1 && n <= 5 ? n : null
}

/** Ainda esperando a impressora (a tela continua se atualizando). */
export function emAndamento(status: Status): boolean {
  return status === 'pendente' || status === 'enviando'
}
