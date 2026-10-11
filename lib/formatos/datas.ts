/** Datas são `timestamptz` no banco e exibidas sempre no fuso da obra. */
export const FUSO_OBRA = 'America/Sao_Paulo'

type Entrada = Date | string

function paraData(entrada: Entrada): Date {
  const data = typeof entrada === 'string' ? new Date(entrada) : entrada
  if (Number.isNaN(data.getTime())) throw new RangeError(`Data inválida: ${String(entrada)}`)
  return data
}

const partesFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_OBRA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

function partes(entrada: Entrada) {
  const p: Record<string, string> = {}
  for (const { type, value } of partesFmt.formatToParts(paraData(entrada))) p[type] = value
  return {
    dia: p.day ?? '',
    mes: p.month ?? '',
    ano: p.year ?? '',
    hora: p.hour ?? '',
    minuto: p.minute ?? '',
    semana: (p.weekday ?? '').replace('.', '').toLowerCase(),
  }
}

/** `dd/MM/yyyy` */
export function formatarData(entrada: Entrada): string {
  const { dia, mes, ano } = partes(entrada)
  return `${dia}/${mes}/${ano}`
}

/** `HH:mm` */
export function formatarHora(entrada: Entrada): string {
  const { hora, minuto } = partes(entrada)
  return `${hora}:${minuto}`
}

/** `dd/MM/yyyy HH:mm` */
export function formatarDataHora(entrada: Entrada): string {
  return `${formatarData(entrada)} ${formatarHora(entrada)}`
}

/** `sáb 11/10`, usado no cabeçalho do app. */
export function formatarDiaCurto(entrada: Entrada): string {
  const { semana, dia, mes } = partes(entrada)
  return `${semana} ${dia}/${mes}`
}

/** Dia civil da obra (`yyyy-MM-dd`), base do fechamento do dia. */
export function diaDaObra(entrada: Entrada): string {
  const { dia, mes, ano } = partes(entrada)
  return `${ano}-${mes}-${dia}`
}
