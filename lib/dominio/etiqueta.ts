/**
 * Adesivo do capacete (60 × 80 mm, 203 dpi = 480 × 640 pontos) em ZPL (Zebra) e
 * TSPL (TSC, Elgin, Argox…). O QR é desenhado pela própria impressora e contém
 * **apenas o token** (RN-17): nada de nome, CPF ou URL.
 */

export type Linguagem = 'ZPL' | 'TSPL'

export type DadosAdesivo = {
  /** Token opaco do QR (pessoa.qr_token). Única coisa dentro do QR. */
  token: string
  nomeCapacete: string
  nomeCompleto: string
  funcao: string
  empresa: string
  obra: string
  matricula: string
}

const LARGURA = 480 // 60 mm × 8 pontos/mm
const MARGEM = 24

/** ZPL: ^ e ~ são comandos; não podem aparecer dentro do texto. */
function textoZpl(texto: string) {
  return texto
    .replace(/[\^~\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** TSPL: o texto vai entre aspas duplas; troca aspas e quebras de linha. */
function textoTspl(texto: string) {
  return texto.replace(/["\\]/g, "'").replace(/\s+/g, ' ').trim()
}

/** O token entra no QR exatamente como está, mas só se for opaco (hexadecimal). */
function tokenSeguro(token: string) {
  if (!/^[0-9a-f]{16,64}$/.test(token)) {
    throw new Error('Token do QR inválido: precisa ser hexadecimal opaco.')
  }
  return token
}

function copiasValidas(copias: number) {
  if (!Number.isInteger(copias) || copias < 1 || copias > 5) {
    throw new Error('Cópias de 1 a 5.')
  }
  return copias
}

function rodape(d: DadosAdesivo) {
  return `ALMOX · ${d.obra} · ${d.matricula}`
}

export function gerarAdesivoZpl(d: DadosAdesivo, copias = 1): string {
  const t = textoZpl
  const larguraTexto = LARGURA - 2 * MARGEM
  return [
    '^XA',
    '^CI28', // UTF-8 (acentos)
    `^PW${LARGURA}`,
    '^LL640',
    '^LH0,0',
    // QR: modelo 2, ampliação 10 (~36 mm), correção M, só o token.
    `^FO95,24^BQN,2,10^FDMA,${tokenSeguro(d.token)}^FS`,
    `^FO${MARGEM},340^A0N,92,92^FB${larguraTexto},1,0,C^FD${t(d.nomeCapacete)}^FS`,
    `^FO${MARGEM},450^A0N,34,34^FB${larguraTexto},1,0,C^FD${t(d.nomeCompleto)}^FS`,
    `^FO${MARGEM},496^A0N,28,28^FB${larguraTexto},2,0,C^FD${t(`${d.funcao} · ${d.empresa}`)}^FS`,
    `^FO${MARGEM},582^GB${larguraTexto},2,2^FS`,
    `^FO${MARGEM},596^A0N,22,22^FB${larguraTexto},1,0,C^FD${t(rodape(d))}^FS`,
    `^PQ${copiasValidas(copias)}`,
    '^XZ',
  ].join('\n')
}

export function gerarAdesivoTspl(d: DadosAdesivo, copias = 1): string {
  const t = textoTspl
  const larguraTexto = LARGURA - 2 * MARGEM
  // BLOCK x,y,largura,altura,"fonte",rotação,escalaX,escalaY,espaço,alinhamento(2=centro),"texto"
  const bloco = (y: number, altura: number, escala: number, texto: string) =>
    `BLOCK ${MARGEM},${y},${larguraTexto},${altura},"0",0,${escala},${escala},0,2,"${t(texto)}"`
  return [
    'SIZE 60 mm,80 mm',
    'GAP 3 mm,0 mm',
    'DIRECTION 1',
    'CODEPAGE UTF-8',
    'CLS',
    // QRCODE x,y,correção,célula,modo(A=automático),rotação,"dados" — só o token.
    `QRCODE 95,24,M,10,A,0,"${tokenSeguro(d.token)}"`,
    bloco(340, 100, 30, d.nomeCapacete),
    bloco(450, 44, 11, d.nomeCompleto),
    bloco(496, 76, 9, `${d.funcao} · ${d.empresa}`),
    `BAR ${MARGEM},582,${larguraTexto},2`,
    bloco(596, 30, 7, rodape(d)),
    `PRINT 1,${copiasValidas(copias)}`,
  ].join('\r\n')
}

export function gerarAdesivo(linguagem: Linguagem, d: DadosAdesivo, copias = 1): string {
  return linguagem === 'ZPL' ? gerarAdesivoZpl(d, copias) : gerarAdesivoTspl(d, copias)
}

/** Etiqueta de teste da tela Impressora (sem dados de pessoa). */
export function gerarEtiquetaTeste(linguagem: Linguagem, obra: string): string {
  if (linguagem === 'ZPL') {
    return [
      '^XA',
      '^CI28',
      `^PW${LARGURA}`,
      '^LL640',
      `^FO${MARGEM},200^A0N,60,60^FB432,1,0,C^FDALMOX^FS`,
      `^FO${MARGEM},290^A0N,30,30^FB432,2,0,C^FD${textoZpl(`Teste de impressão · ${obra}`)}^FS`,
      '^PQ1',
      '^XZ',
    ].join('\n')
  }
  return [
    'SIZE 60 mm,80 mm',
    'GAP 3 mm,0 mm',
    'DIRECTION 1',
    'CODEPAGE UTF-8',
    'CLS',
    `BLOCK ${MARGEM},200,432,80,"0",0,20,20,0,2,"ALMOX"`,
    `BLOCK ${MARGEM},290,432,80,"0",0,10,10,0,2,"${textoTspl(`Teste de impressão · ${obra}`)}"`,
    'PRINT 1,1',
  ].join('\r\n')
}
