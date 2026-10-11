import { diaDaObra, formatarData, formatarHora } from '@/lib/formatos/datas'
import { primeiroNome } from './leitura'

/** Como a pessoa foi aberta: QR conferido, escolhida na lista manual, ou pela lista geral. */
export type ComoIdentificada = 'qr' | 'manual' | 'lista'

export type TextoIdentificacao = { texto: string; tom: 'sucesso' | 'erro' | 'neutro' }

/**
 * Texto de identificação da ficha (F-04). Para quem lança, "QR" só vale com conferência
 * vigente no servidor; sem ela, conta como aberta pela lista.
 */
export function textoIdentificacao(
  como: ComoIdentificada,
  lanca: boolean,
  conferida: boolean,
): TextoIdentificacao {
  if (como === 'qr' && !lanca) return { texto: 'QR do capacete lido', tom: 'sucesso' }
  if (como === 'qr' && conferida) {
    return { texto: 'QR do capacete · pessoa conferida', tom: 'sucesso' }
  }
  if (como === 'manual') return { texto: 'Escolhido na lista · sem QR', tom: 'erro' }
  return { texto: 'Aberto pela lista', tom: 'neutro' }
}

export type ViaPosse = 'qr' | 'manual'

export type RegraDevolucao = {
  permitida: boolean
  /** Aviso quando sem QR (RN-02/RN-06); null quando não há o que avisar. */
  aviso: string | null
  /** Mostra o atalho "Ler capacete do {nome}". */
  pedirCapacete: boolean
}

/**
 * Devolução na ficha (RN-02/RN-06): com o capacete conferido devolve tudo; sem ele, só o
 * que saiu sem QR. O que saiu com QR só volta com o capacete de quem pegou.
 */
export function regraDevolucao(
  vias: ViaPosse[],
  conferidaPorQr: boolean,
  nome: string,
): RegraDevolucao {
  if (vias.length === 0) return { permitida: false, aviso: null, pedirCapacete: false }
  if (conferidaPorQr) return { permitida: true, aviso: null, pedirCapacete: false }
  const manuais = vias.filter((v) => v === 'manual').length
  const primeiro = primeiroNome(nome)
  if (manuais === vias.length) return { permitida: true, aviso: null, pedirCapacete: false }
  if (manuais > 0) {
    return {
      permitida: true,
      aviso: `Sem o QR, ${primeiro} só devolve o que pegou sem QR. O resto saiu com o capacete e só volta com o capacete.`,
      pedirCapacete: true,
    }
  }
  return {
    permitida: false,
    aviso: `Devolução só com o capacete de quem pegou. As ferramentas estão no nome do ${primeiro}: ele mesmo precisa vir devolver.`,
    pedirCapacete: true,
  }
}

/** Pendência: com a pessoa desde antes de hoje (dia da obra, fuso de São Paulo). */
export function ehPendencia(desde: string, agora: Date): boolean {
  return diaDaObra(desde) < diaDaObra(agora)
}

/** "desde 07:30", "desde ontem 16:40" ou "desde 09/10". */
export function textoDesde(desde: string, agora: Date): string {
  const dia = diaDaObra(desde)
  if (dia === diaDaObra(agora)) return `desde ${formatarHora(desde)}`
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  if (dia === diaDaObra(ontem)) return `desde ontem ${formatarHora(desde)}`
  return `desde ${formatarData(desde).slice(0, 5)}`
}

/** "nada", "1 item", "3 itens". */
export function contarItens(n: number): string {
  return n === 0 ? 'nada' : `${n} ${n === 1 ? 'item' : 'itens'}`
}
