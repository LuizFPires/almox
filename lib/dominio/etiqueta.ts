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
const ALTURA = 640 // 80 mm
const MARGEM = 24

/** Caracteres de controle (ESC etc.): a impressora executa alguns na hora, até dentro de texto. */
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g

/** ZPL: ^ e ~ são comandos; não podem aparecer dentro do texto. */
function textoZpl(texto: string) {
  return texto
    .replace(CONTROLE, ' ')
    .replace(/[\^~\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** TSPL: o texto vai entre aspas duplas; troca aspas e quebras de linha. */
function textoTspl(texto: string) {
  return texto.replace(CONTROLE, ' ').replace(/["\\]/g, "'").replace(/\s+/g, ' ').trim()
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

/** Largura média de uma letra da fonte 0 (maiúsculas), em fração da altura. Conservador. */
const LARGURA_LETRA = 0.62
const LARGURA_TEXTO = LARGURA - 2 * MARGEM

/** Maior altura (pontos) em que o texto cabe em `linhas` linhas, entre `minimo` e `maximo`. */
function alturaQueCabe(texto: string, maximo: number, minimo: number, linhas = 1) {
  const letras = Math.max(1, texto.length)
  const cabe = Math.floor((LARGURA_TEXTO * linhas) / (letras * LARGURA_LETRA))
  return Math.max(minimo, Math.min(maximo, cabe))
}

/** Corta com "..." para caber em `letras` caracteres. */
function cortar(texto: string, letras: number) {
  return texto.length <= letras ? texto : `${texto.slice(0, Math.max(1, letras - 3)).trimEnd()}...`
}

const ALTURA_RODAPE = 22

/**
 * Posições e tamanhos do adesivo, em pontos (203 dpi). Fonte única para ZPL, TSPL e a
 * prévia na tela: nome comprido encolhe para caber numa linha (nunca sobrepõe nem corta).
 */
export function layoutAdesivo(d: Omit<DadosAdesivo, 'token'>) {
  const funcaoEmpresa = `${d.funcao} · ${d.empresa}`
  // Rodapé: "ALMOX · obra" à esquerda, matrícula à direita (corta a obra se precisar).
  // Rodapé tem minúsculas e números: letra média mais estreita que a das maiúsculas.
  const letraRodape = ALTURA_RODAPE * 0.5
  const espacoEsquerda = LARGURA_TEXTO - (d.matricula.length + 2) * letraRodape
  return {
    largura: LARGURA,
    altura: ALTURA,
    margem: MARGEM,
    larguraTexto: LARGURA_TEXTO,
    // QR: ampliação 9 (~33 mm) com margem silenciosa de 4 módulos no topo.
    qr: { x: 110, y: 36, ampliacao: 9 },
    capacete: { y: 340, altura: alturaQueCabe(d.nomeCapacete, 92, 40), texto: d.nomeCapacete },
    nome: { y: 448, altura: alturaQueCabe(d.nomeCompleto, 34, 22), texto: d.nomeCompleto },
    funcao: { y: 494, altura: alturaQueCabe(funcaoEmpresa, 28, 20, 2), texto: funcaoEmpresa },
    linha: { y: 582 },
    rodape: {
      y: 598,
      altura: ALTURA_RODAPE,
      esquerda: cortar(`ALMOX · ${d.obra}`, Math.floor(espacoEsquerda / letraRodape)),
      direita: d.matricula,
    },
  }
}

/** TSPL mede a fonte 0 em pontos tipográficos (1/72"): 203 dpi ÷ 72 ≈ 2,82 pontos. */
const escalaTspl = (alturaPontos: number) => Math.max(1, Math.round(alturaPontos / 2.82))

export function gerarAdesivoZpl(d: DadosAdesivo, copias = 1): string {
  const t = textoZpl
  const l = layoutAdesivo(d)
  const texto = (y: number, altura: number, linhas: number, alinhar: 'L' | 'C' | 'R', s: string) =>
    `^FO${MARGEM},${y}^A0N,${altura},${altura}^FB${LARGURA_TEXTO},${linhas},0,${alinhar}^FD${t(s)}^FS`
  return [
    '^XA',
    '^CI28', // UTF-8 (acentos)
    `^PW${LARGURA}`,
    `^LL${ALTURA}`,
    '^LH0,0',
    // QR: modelo 2, correção M, só o token.
    `^FO${l.qr.x},${l.qr.y}^BQN,2,${l.qr.ampliacao}^FDMA,${tokenSeguro(d.token)}^FS`,
    texto(l.capacete.y, l.capacete.altura, 1, 'C', l.capacete.texto),
    texto(l.nome.y, l.nome.altura, 1, 'C', l.nome.texto),
    texto(l.funcao.y, l.funcao.altura, 2, 'C', l.funcao.texto),
    `^FO${MARGEM},${l.linha.y}^GB${LARGURA_TEXTO},2,2^FS`,
    texto(l.rodape.y, l.rodape.altura, 1, 'L', l.rodape.esquerda),
    texto(l.rodape.y, l.rodape.altura, 1, 'R', l.rodape.direita),
    `^PQ${copiasValidas(copias)}`,
    '^XZ',
  ].join('\n')
}

export function gerarAdesivoTspl(d: DadosAdesivo, copias = 1): string {
  const t = textoTspl
  const l = layoutAdesivo(d)
  // BLOCK x,y,largura,altura,"fonte",rotação,escalaX,escalaY,espaço,alinhamento(1 esq., 2 centro, 3 dir.),"texto"
  const bloco = (y: number, altura: number, linhas: number, alinhar: 1 | 2 | 3, s: string) => {
    const escala = escalaTspl(altura)
    return `BLOCK ${MARGEM},${y},${LARGURA_TEXTO},${Math.ceil(altura * 1.2 * linhas)},"0",0,${escala},${escala},0,${alinhar},"${t(s)}"`
  }
  return [
    'SIZE 60 mm,80 mm',
    'GAP 3 mm,0 mm',
    'DIRECTION 1',
    'CODEPAGE UTF-8',
    'CLS',
    // QRCODE x,y,correção,célula,modo(A=automático),rotação,"dados" — só o token.
    `QRCODE ${l.qr.x},${l.qr.y},M,${l.qr.ampliacao},A,0,"${tokenSeguro(d.token)}"`,
    bloco(l.capacete.y, l.capacete.altura, 1, 2, l.capacete.texto),
    bloco(l.nome.y, l.nome.altura, 1, 2, l.nome.texto),
    bloco(l.funcao.y, l.funcao.altura, 2, 2, l.funcao.texto),
    `BAR ${MARGEM},${l.linha.y},${LARGURA_TEXTO},2`,
    bloco(l.rodape.y, l.rodape.altura, 1, 1, l.rodape.esquerda),
    bloco(l.rodape.y, l.rodape.altura, 1, 3, l.rodape.direita),
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
