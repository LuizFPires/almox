import { formatarHora } from '@/lib/formatos/datas'

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
  return { online: false, texto: `Agente offline desde ${formatarHora(ultimo)}` }
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

/** IPv4 da rede local (a impressora nunca fica exposta à internet). */
export function validarIp(ip: string): string | null {
  const partes = ip.trim().split('.')
  const ok = partes.length === 4 && partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  return ok ? null : 'IP inválido. Ex.: 192.168.0.50'
}
