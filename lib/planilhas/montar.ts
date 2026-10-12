import ExcelJS from 'exceljs'
import {
  resumoItens,
  ROTULO_CATEGORIA,
  textoVia,
  type LinhaHistorico,
} from '@/lib/dominio/historico'

/**
 * Planilhas (.xlsx) do histórico e dos descontos, no padrão brasileiro: datas dd/mm/aaaa hh:mm
 * no fuso da obra e valores como número com formato R$ (somáveis no Excel). Os valores vêm em
 * centavos inteiros; a divisão por 100 acontece só aqui, na célula.
 */

const FORMATO_DATA = 'dd/mm/yyyy hh:mm'
const FORMATO_REAL = '"R$" #,##0.00'
const SAO_PAULO_MS = -3 * 60 * 60 * 1000

/** A planilha não tem fuso: grava a hora de parede de São Paulo (UTC−3, sem horário de verão). */
function dataDaObra(iso: string): Date {
  return new Date(Date.parse(iso) + SAO_PAULO_MS)
}

function celulaReais(centavos: number): number {
  return centavos / 100
}

function novaAba(livro: ExcelJS.Workbook, nome: string, colunas: Partial<ExcelJS.Column>[]) {
  const aba = livro.addWorksheet(nome, { views: [{ state: 'frozen', ySplit: 1 }] })
  aba.columns = colunas
  aba.getRow(1).font = { bold: true }
  return aba
}

async function paraBuffer(livro: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await livro.xlsx.writeBuffer())
}

export async function planilhaHistorico(linhas: LinhaHistorico[]): Promise<Buffer> {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'Almox'
  const aba = novaAba(livro, 'Histórico', [
    { header: 'Data e hora', key: 'quando', width: 18, style: { numFmt: FORMATO_DATA } },
    { header: 'Lançamento', key: 'tipo', width: 12 },
    { header: 'Pessoa', key: 'pessoa', width: 26 },
    { header: 'Empresa', key: 'empresa', width: 22 },
    { header: 'Ferramentas', key: 'itens', width: 44 },
    { header: 'Quantidade', key: 'quantidade', width: 11 },
    { header: 'Identificação', key: 'via', width: 24 },
    { header: 'Lançado por', key: 'usuario', width: 22 },
    {
      header: 'Chegou ao servidor (sem internet)',
      key: 'recebido',
      width: 18,
      style: { numFmt: FORMATO_DATA },
    },
    { header: 'Motivo do estorno', key: 'obs', width: 30 },
  ])
  for (const l of linhas) {
    aba.addRow({
      quando: dataDaObra(l.quando),
      tipo: ROTULO_CATEGORIA[l.tipo],
      pessoa: l.pessoa,
      empresa: l.empresa,
      itens: resumoItens(l.itens),
      quantidade: l.itens.length || null,
      via: textoVia(l),
      usuario: l.usuario,
      recebido: l.recebidoEm ? dataDaObra(l.recebidoEm) : null,
      obs: l.obs,
    })
  }
  return paraBuffer(livro)
}

export type LinhaDesconto = {
  criado_em: string
  cancelado_em: string | null
  tipo_nome: string
  codigo: string
  valor: number
  status: 'aberto' | 'cancelado' | 'confirmado'
  empresa: { nome: string } | null
  pessoa: { nome: string } | null
}

const SITUACAO: Record<LinhaDesconto['status'], string> = {
  aberto: 'A descontar',
  cancelado: 'Cancelado (devolvida)',
  confirmado: 'Descontado na medição',
}

/** Uma linha por peça cobrada (aviso de não devolução), com o total a descontar no fim. */
export async function planilhaDescontos(linhas: LinhaDesconto[]): Promise<Buffer> {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'Almox'
  const aba = novaAba(livro, 'Avisos e descontos', [
    { header: 'Pendente desde', key: 'criado', width: 18, style: { numFmt: FORMATO_DATA } },
    { header: 'Empresa', key: 'empresa', width: 24 },
    { header: 'Pessoa', key: 'pessoa', width: 26 },
    { header: 'Ferramenta', key: 'tipo', width: 22 },
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Valor', key: 'valor', width: 14, style: { numFmt: FORMATO_REAL } },
    { header: 'Situação', key: 'situacao', width: 24 },
    { header: 'Cancelado em', key: 'cancelado', width: 18, style: { numFmt: FORMATO_DATA } },
  ])
  for (const d of linhas) {
    aba.addRow({
      criado: dataDaObra(d.criado_em),
      empresa: d.empresa?.nome ?? '',
      pessoa: d.pessoa?.nome ?? '',
      tipo: d.tipo_nome,
      codigo: d.codigo,
      valor: celulaReais(d.valor),
      situacao: SITUACAO[d.status],
      cancelado: d.cancelado_em ? dataDaObra(d.cancelado_em) : null,
    })
  }
  const aDescontar = linhas.filter((d) => d.status === 'aberto').reduce((s, d) => s + d.valor, 0)
  const total = aba.addRow({ situacao: 'Total a descontar', valor: celulaReais(aDescontar) })
  total.font = { bold: true }
  return paraBuffer(livro)
}
