import type { DadosAdesivo } from './etiqueta'

/** Largura média de uma letra, em fração da altura (Inter): maiúsculas e texto misto. */
const LETRA_MAIUSCULA = 0.66
const LETRA_MISTA = 0.54

/** Maior altura (mm) em que o texto cabe numa linha de `larguraMm`, entre `minimo` e `maximo`. */
function alturaQueCabe(
  texto: string,
  larguraMm: number,
  maximo: number,
  minimo: number,
  letra: number,
) {
  const cabe = larguraMm / (Math.max(1, texto.length) * letra)
  return Math.round(Math.max(minimo, Math.min(maximo, cabe)) * 10) / 10
}

type Linha = { texto: string; y: number; altura: number; peso: 'forte' | 'medio' | 'normal' }

export type LayoutA4 = {
  larguraMm: number
  alturaMm: number
  margemMm: number
  qr: { x: number; y: number; lado: number }
  linhas: Linha[]
  /** Fio acima do rodapé. */
  fio: number
  rodape: { y: number; altura: number; esquerda: string; direita: string }
}

/**
 * Adesivo Médio (5 × 6,5 cm) e Pequeno (4,5 × 6 cm) para a folha A4, em mm. O QR leva só o
 * token (RN-17); o apelido do capacete vem grande e encolhe para caber numa linha. O Grande
 * (6 × 8 cm) usa o mesmo desenho da etiqueta térmica (`layoutAdesivo`).
 */
export function layoutAdesivoA4(
  d: Omit<DadosAdesivo, 'token'>,
  tamanho: 'medio' | 'pequeno',
): LayoutA4 {
  const medio = tamanho === 'medio'
  const larguraMm = medio ? 50 : 45
  const alturaMm = medio ? 65 : 60
  const margemMm = medio ? 3 : 2.5
  const util = larguraMm - 2 * margemMm
  const lado = medio ? 28 : 25
  const qr = { x: (larguraMm - lado) / 2, y: 3, lado }
  const yCapacete = qr.y + lado + 2.5
  const capacete = alturaQueCabe(d.nomeCapacete, util, medio ? 8.5 : 8, 4, LETRA_MAIUSCULA)
  const yNome = yCapacete + capacete + 1.5
  const nome = alturaQueCabe(d.nomeCompleto, util, medio ? 3.6 : 3.2, 2.4, LETRA_MISTA)
  const linhas: Linha[] = [
    { texto: d.nomeCapacete, y: yCapacete, altura: capacete, peso: 'forte' },
    { texto: d.nomeCompleto, y: yNome, altura: nome, peso: 'medio' },
  ]
  if (medio) {
    const funcaoEmpresa = `${d.funcao} · ${d.empresa}`
    linhas.push({
      texto: funcaoEmpresa,
      y: yNome + nome + 1,
      altura: alturaQueCabe(funcaoEmpresa, util, 3, 2.2, LETRA_MISTA),
      peso: 'normal',
    })
  }
  const alturaRodape = medio ? 2.6 : 2.4
  const yRodape = alturaMm - margemMm - alturaRodape
  return {
    larguraMm,
    alturaMm,
    margemMm,
    qr,
    linhas,
    fio: yRodape - 1.5,
    rodape: {
      y: yRodape,
      altura: alturaRodape,
      esquerda: medio ? `ALMOX · ${d.obra}` : 'ALMOX',
      direita: d.matricula,
    },
  }
}
