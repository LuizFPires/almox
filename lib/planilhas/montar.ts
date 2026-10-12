import ExcelJS from 'exceljs'
import {
  metaAvisos,
  metaPerdas,
  metaRastreabilidade,
  metaSemQr,
  metaTempo,
  type Metricas,
} from '@/lib/dominio/metricas'
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
export async function planilhaDescontos(
  linhas: LinhaDesconto[],
  opcoes: { aDescontar?: number; limite?: number } = {},
): Promise<Buffer> {
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
  // Total de todos os descontos em aberto (mesmo os que passaram do limite de linhas).
  const aDescontar =
    opcoes.aDescontar ??
    linhas.filter((d) => d.status === 'aberto').reduce((s, d) => s + d.valor, 0)
  const total = aba.addRow({ situacao: 'Total a descontar', valor: celulaReais(aDescontar) })
  total.font = { bold: true }
  if (opcoes.limite && linhas.length >= opcoes.limite) {
    aba.addRow({
      empresa: `Só as ${opcoes.limite} peças mais recentes estão listadas; o total considera todas.`,
    })
  }
  return paraBuffer(livro)
}

/** Relatório do piloto: as metas do período e as métricas por semana (PRD §3). */
export async function planilhaMetricas(
  { semanas, total }: Metricas,
  periodo: { de: string; ate: string; hoje: string },
): Promise<Buffer> {
  const livro = new ExcelJS.Workbook()
  livro.creator = 'Almox'
  const resumo = novaAba(livro, 'Metas', [
    { header: 'Métrica', key: 'metrica', width: 34 },
    { header: 'Resultado', key: 'resultado', width: 22 },
    { header: 'Meta (PRD)', key: 'meta', width: 26 },
    { header: 'Atingida', key: 'ok', width: 10 },
  ])
  const tempo = metaTempo(total)
  const linhas: [string, ReturnType<typeof metaSemQr>, string][] = [
    ['Tempo do QR lido até a retirada (média)', tempo, 'até 15 s'],
    ['Retiradas sem QR', metaSemQr(semanas), 'menos de 10%'],
    [
      'Ferramentas não devolvidas por semana (semanas inteiras)',
      metaPerdas(semanas, periodo.de, periodo.hoje),
      'queda de 50% em 60 dias',
    ],
    ['Pendências de empreiteira com aviso', metaAvisos(semanas), '100%'],
    ['Movimentos com pessoa, almoxarife, hora e via', metaRastreabilidade(semanas), '100%'],
  ]
  for (const [metrica, m, meta] of linhas) {
    resumo.addRow({
      metrica,
      resultado: m.texto,
      meta,
      ok: m.ok === null ? '—' : m.ok ? 'sim' : 'não',
    })
  }
  resumo.addRow({
    metrica: 'Tempo do QR lido até a retirada (mediana)',
    resultado: tempo.mediana === null ? '—' : `${tempo.mediana.toLocaleString('pt-BR')} s`,
  })
  resumo.addRow({
    metrica: 'Retiradas medidas em até 15 s',
    resultado: tempo.ate15 === null ? '—' : `${tempo.ate15.toLocaleString('pt-BR')}%`,
  })
  resumo.addRow({})
  resumo.addRow({
    metrica: `Período: ${periodo.de.split('-').reverse().join('/')} a ${periodo.ate.split('-').reverse().join('/')}`,
  })
  resumo.addRow({ metrica: 'Atraso até a TV (meta até 3 s): medido na obra com cronômetro.' })

  const aba = novaAba(livro, 'Por semana', [
    { header: 'Semana (segunda)', key: 'semana', width: 16, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Retiradas', key: 'retiradas', width: 11 },
    { header: 'Sem QR', key: 'semQr', width: 9 },
    { header: '% sem QR', key: 'pct', width: 10, style: { numFmt: '0.0%' } },
    { header: 'Tempo mediano (s)', key: 'mediana', width: 17 },
    { header: 'Tempo médio (s)', key: 'media', width: 15 },
    { header: 'Medidas', key: 'medidas', width: 9 },
    { header: 'Até 15 s', key: 'ate15', width: 9 },
    { header: 'Não devolvidas', key: 'pendencias', width: 14 },
    { header: 'Com aviso', key: 'aviso', width: 10 },
  ])
  for (const s of semanas) {
    aba.addRow({
      semana: new Date(`${s.semana}T12:00:00Z`),
      retiradas: s.retiradas,
      semQr: s.semQr,
      pct: s.retiradas > 0 ? s.semQr / s.retiradas : null,
      mediana: s.tempoMedianaS,
      media: s.tempoMedioS,
      medidas: s.tempoMedidas,
      ate15: s.tempoAte15s,
      pendencias: s.pendencias,
      aviso: s.pendenciasComAviso,
    })
  }
  return paraBuffer(livro)
}
