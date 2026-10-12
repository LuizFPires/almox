import ExcelJS from 'exceljs'
import { ABAS, type Planilha } from '@/lib/dominio/importacao'
import { FUNCOES_SUGERIDAS } from '@/lib/dominio/cadastros'

/** Planilha modelo do cadastro inicial: uma aba por cadastro, com exemplo e listas de escolha. */
export async function planilhaModelo(icones: readonly string[]): Promise<Buffer> {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'Almox'
  const leia = livro.addWorksheet('Leia-me')
  leia.getColumn(1).width = 100
  for (const linha of [
    'Cadastro inicial do Almox',
    '',
    '1. Preencha as abas Empresas, Pessoas e Ferramentas (uma linha por cadastro). Apague as linhas de exemplo.',
    '2. A empresa de cada pessoa precisa estar na aba Empresas ou já cadastrada no Almox.',
    '3. Nome no capacete e prefixo do código podem ficar vazios: o Almox sugere.',
    '4. Valor de reposição em reais, como 2.890,00. Quantidade de 1 a 200 por ferramenta.',
    '5. Em Cadastros › Importar planilha, envie o arquivo: o Almox mostra a prévia e os erros antes de gravar.',
  ]) {
    leia.addRow([linha])
  }
  leia.getRow(1).font = { bold: true, size: 14 }

  const exemplos: Record<keyof typeof ABAS, (string | number)[]> = {
    empresas: [
      'Fôrmas Ribeiro',
      'Empreiteira',
      'Roberto Ribeiro',
      'roberto@formasribeiro.com.br',
      '',
    ],
    pessoas: ['José Carlos Teixeira', 'ZÉ CARLOS', 'Carpinteiro', 'Fôrmas Ribeiro'],
    ferramentas: ['Martelete', 'Martelete', '', '2.890,00', 3, 'sim'],
  }
  for (const chave of Object.keys(ABAS) as (keyof typeof ABAS)[]) {
    const aba = livro.addWorksheet(ABAS[chave].nome, { views: [{ state: 'frozen', ySplit: 1 }] })
    aba.columns = ABAS[chave].colunas.map((h) => ({ header: h, width: Math.max(16, h.length + 4) }))
    aba.getRow(1).font = { bold: true }
    aba.addRow(exemplos[chave])
    // Texto em todas as colunas (valor "2.890,00" e prefixo não viram número).
    aba.columns.forEach((c) => (c.numFmt = '@'))
    const lista = (coluna: string, valores: readonly string[]) => {
      for (let l = 2; l <= 1000; l++) {
        aba.getCell(`${coluna}${l}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${valores.join(',')}"`],
        }
      }
    }
    if (chave === 'empresas') lista('B', ['Empreiteira', 'Própria'])
    if (chave === 'pessoas') lista('C', FUNCOES_SUGERIDAS)
    if (chave === 'ferramentas') {
      lista('B', icones)
      lista('F', ['sim', 'não'])
    }
  }
  return Buffer.from(await livro.xlsx.writeBuffer())
}

const MAX_LINHAS = 5000

/**
 * Texto da célula como o engenheiro vê. Número (ex.: valor digitado como 12,345 num Excel em
 * português) vira texto no padrão brasileiro com vírgula, para não virar R$ 12.345,00.
 */
function textoDaCelula(celula: ExcelJS.Cell): string {
  const v = celula.value
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')
  return celula.text ?? ''
}

/** Lê o arquivo enviado: as linhas de cada aba (sem cabeçalho), células como texto. */
export async function lerPlanilha(arquivo: ArrayBuffer): Promise<Planilha | { erro: string }> {
  const livro = new ExcelJS.Workbook()
  try {
    await livro.xlsx.load(arquivo)
  } catch {
    return { erro: 'Não foi possível abrir o arquivo. Envie a planilha modelo em .xlsx.' }
  }
  const resultado: Planilha = { empresas: [], pessoas: [], ferramentas: [] }
  let achou = false
  let erro: string | null = null
  for (const chave of Object.keys(ABAS) as (keyof typeof ABAS)[]) {
    const aba = livro.getWorksheet(ABAS[chave].nome)
    if (!aba) continue
    achou = true
    const colunas = ABAS[chave].colunas.length
    // Planilha gigante (ou célula perdida na linha 1 milhão): recusa antes de montar as linhas.
    if (aba.rowCount > MAX_LINHAS + 1) {
      erro = `A aba ${ABAS[chave].nome} tem mais de ${MAX_LINHAS} linhas.`
      continue
    }
    aba.eachRow({ includeEmpty: true }, (linha, n) => {
      if (n === 1) return
      const celulas: string[] = []
      for (let c = 1; c <= colunas; c++) celulas.push(textoDaCelula(linha.getCell(c)))
      resultado[chave][n - 2] = celulas
    })
    // eachRow pula linhas nunca tocadas: preenche os buracos para manter o número da linha.
    for (let i = 0; i < resultado[chave].length; i++) resultado[chave][i] ??= []
  }
  if (erro) return { erro }
  if (!achou)
    return { erro: 'A planilha não tem as abas Empresas, Pessoas ou Ferramentas do modelo.' }
  return resultado
}
