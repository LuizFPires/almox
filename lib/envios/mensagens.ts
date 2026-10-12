import { formatarData, formatarHora } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'

/** Uma peça no aviso (snapshot do encerramento). Valor em centavos. */
export type ItemAviso = {
  pessoa: string
  tipo: string
  codigo: string
  valor: number
  desde: string
}

export type DadosAviso = {
  obra: string
  empresa: string
  dono: string | null
  encarregado: string | null
  /** Dia do encerramento (dd/MM no assunto). */
  data: string
  itens: ItemAviso[]
  total: number
}

export type DadosCancelamento = {
  obra: string
  empresa: string
  dono: string | null
  encarregado: string | null
  quando: string
  devolvidas: { pessoa: string; tipo: string; codigo: string; valor: number }[]
  /** O que continua em aberto para a empresa depois do cancelamento. */
  emAberto: number
  /** Devolução de verdade ou lançamento corrigido pelo engenheiro (estorno). */
  motivo?: 'devolucao' | 'corrigido'
}

export type Email = { assunto: string; html: string; texto: string }
export type Notificacao = { titulo: string; corpo: string; url: string }

/** Texto que vai dentro do HTML do e-mail: sem marcação vinda do cadastro. */
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ddmm = (iso: string) => formatarData(iso).slice(0, 5)

/** "Olá, Roberto e Paulo." / "Olá, Roberto." / "Olá." */
export function saudacao(dono: string | null, encarregado: string | null): string {
  const nomes = [dono, encarregado]
    .map((n) => n?.trim().split(/\s+/)[0])
    .filter((n): n is string => Boolean(n))
  const unicos = [...new Set(nomes)]
  return unicos.length ? `Olá, ${unicos.join(' e ')}.` : 'Olá.'
}

/** Agrupa as peças por pessoa: "Pá ×2, Martelete". */
export function porPessoa(itens: { pessoa: string; tipo: string; valor: number }[]) {
  const pessoas = new Map<string, { tipos: Map<string, number>; valor: number }>()
  for (const i of itens) {
    const p = pessoas.get(i.pessoa) ?? { tipos: new Map(), valor: 0 }
    p.tipos.set(i.tipo, (p.tipos.get(i.tipo) ?? 0) + 1)
    p.valor += i.valor
    pessoas.set(i.pessoa, p)
  }
  return [...pessoas.entries()].map(([pessoa, p]) => ({
    pessoa,
    itens: [...p.tipos.entries()].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t)).join(', '),
    valor: p.valor,
  }))
}

function moldura(corpo: string, obra: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F6F7F9;font-family:Inter,Arial,sans-serif;color:#1F2937">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#FFFFFF;border-radius:16px;padding:24px">${corpo}</div>
<p style="font-size:13px;color:#586474;margin:16px 4px">Almox · ${escapar(obra)} · mensagem automática</p>
</div></body></html>`
}

function tabela(
  linhas: { pessoa: string; itens: string; valor: number }[],
  rotuloTotal: string,
  total: number,
) {
  const tr = linhas
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB">${escapar(l.pessoa)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #E5E7EB">${escapar(l.itens)}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;white-space:nowrap">${formatarBRL(l.valor)}</td></tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
<thead><tr style="text-align:left;color:#586474;font-size:13px"><th style="padding:0 0 6px">Pessoa</th><th style="padding:0 8px 6px">Ferramentas</th><th style="padding:0 0 6px;text-align:right">Valor</th></tr></thead>
<tbody>${tr}</tbody>
<tfoot><tr><td colspan="2" style="padding:10px 0 0;font-weight:700">${rotuloTotal}</td><td style="padding:10px 0 0;text-align:right;font-weight:700;white-space:nowrap">${formatarBRL(total)}</td></tr></tfoot>
</table>`
}

/** E-mail do aviso do dia (RN-13). Peça de dia anterior entra como lembrete, mesmo valor. */
export function emailAviso(d: DadosAviso): Email {
  const dia = ddmm(d.data)
  const lembrete = d.itens.some((i) => ddmm(i.desde) !== dia)
  const linhas = porPessoa(d.itens)
  const assunto = `Ferramentas não devolvidas · ${d.empresa} · ${dia}`
  const abertura = `As ferramentas abaixo foram retiradas por funcionários da ${d.empresa} e não foram devolvidas ao almoxarifado até o fechamento do dia ${dia}${lembrete ? ' (inclui peças de dias anteriores, que continuam pendentes)' : ''}:`
  const regra =
    'Esse valor será descontado na próxima medição da ' +
    d.empresa +
    ' para reposição das ferramentas no canteiro. Se as ferramentas forem devolvidas antes do fechamento da medição, o desconto é cancelado.'
  const html = moldura(
    `<p style="margin:0 0 12px">${escapar(saudacao(d.dono, d.encarregado))}</p>
<p style="margin:0 0 16px">${escapar(abertura)}</p>
${tabela(linhas, 'Total para reposição', d.total)}
<p style="margin:16px 0 0;background:#FEF3C7;color:#854D0E;border-radius:10px;padding:12px">Esse valor será <b>descontado na próxima medição</b> da ${escapar(d.empresa)} para reposição das ferramentas no canteiro. Se as ferramentas forem devolvidas antes do fechamento da medição, o desconto é cancelado.</p>`,
    d.obra,
  )
  const texto = [
    saudacao(d.dono, d.encarregado),
    '',
    abertura,
    '',
    ...linhas.map((l) => `- ${l.pessoa}: ${l.itens} · ${formatarBRL(l.valor)}`),
    '',
    `Total para reposição: ${formatarBRL(d.total)}`,
    '',
    regra,
    '',
    `Almox · ${d.obra} · mensagem automática`,
  ].join('\n')
  return { assunto, html, texto }
}

/** E-mail de cancelamento peça a peça (RN-14). */
export function emailCancelamento(d: DadosCancelamento): Email {
  const linhas = porPessoa(d.devolvidas)
  const cancelado = d.devolvidas.reduce((s, x) => s + x.valor, 0)
  const assunto = `Desconto cancelado · ${d.empresa} · ${ddmm(d.quando)}`
  const abertura =
    d.motivo === 'corrigido'
      ? `Em ${ddmm(d.quando)} às ${formatarHora(d.quando)} o engenheiro corrigiu um lançamento: estas ferramentas saem do desconto:`
      : `Estas ferramentas foram devolvidas em ${ddmm(d.quando)} às ${formatarHora(d.quando)}, antes do fechamento da medição. O desconto delas foi cancelado:`
  const restante =
    d.emAberto > 0
      ? `Continua em aberto para a próxima medição: ${formatarBRL(d.emAberto)}.`
      : 'Não há mais nenhum valor em aberto da ' + d.empresa + '.'
  const html = moldura(
    `<p style="margin:0 0 12px">${escapar(saudacao(d.dono, d.encarregado))}</p>
<p style="margin:0 0 16px">${escapar(abertura)}</p>
${tabela(linhas, 'Desconto cancelado', cancelado)}
<p style="margin:16px 0 0;background:#DCFCE7;color:#166534;border-radius:10px;padding:12px">${escapar(restante)}</p>`,
    d.obra,
  )
  const texto = [
    saudacao(d.dono, d.encarregado),
    '',
    abertura,
    '',
    ...linhas.map((l) => `- ${l.pessoa}: ${l.itens} · ${formatarBRL(l.valor)}`),
    '',
    `Desconto cancelado: ${formatarBRL(cancelado)}`,
    restante,
    '',
    `Almox · ${d.obra} · mensagem automática`,
  ].join('\n')
  return { assunto, html, texto }
}

/** Estorno de uma devolução lançada por engano: o desconto volta a valer (com aviso). */
export function emailReaberto(d: DadosCancelamento): Email {
  const linhas = porPessoa(d.devolvidas)
  const reaberto = d.devolvidas.reduce((s, x) => s + x.valor, 0)
  const assunto = `Desconto corrigido · ${d.empresa} · ${ddmm(d.quando)}`
  const abertura = `O engenheiro corrigiu em ${ddmm(d.quando)} uma devolução lançada por engano: estas ferramentas não voltaram ao almoxarifado e o desconto delas volta a valer:`
  const restante = `Em aberto para a próxima medição: ${formatarBRL(d.emAberto)}. Se as ferramentas forem devolvidas antes do fechamento da medição, o desconto é cancelado.`
  const html = moldura(
    `<p style="margin:0 0 12px">${escapar(saudacao(d.dono, d.encarregado))}</p>
<p style="margin:0 0 16px">${escapar(abertura)}</p>
${tabela(linhas, 'Volta a valer', reaberto)}
<p style="margin:16px 0 0;background:#FEF3C7;color:#854D0E;border-radius:10px;padding:12px">${escapar(restante)}</p>`,
    d.obra,
  )
  const texto = [
    saudacao(d.dono, d.encarregado),
    '',
    abertura,
    '',
    ...linhas.map((l) => `- ${l.pessoa}: ${l.itens} · ${formatarBRL(l.valor)}`),
    '',
    `Volta a valer: ${formatarBRL(reaberto)}`,
    restante,
    '',
    `Almox · ${d.obra} · mensagem automática`,
  ].join('\n')
  return { assunto, html, texto }
}

export function notificacaoReaberto(empresa: string, valor: number): Notificacao {
  return {
    titulo: 'Almox · desconto corrigido',
    corpo: `${empresa}: uma devolução lançada por engano foi corrigida; ${formatarBRL(valor)} voltam a valer na próxima medição.`,
    url: '/avisos',
  }
}

export function notificacaoAviso(empresa: string, total: number, aviso: string): Notificacao {
  return {
    titulo: 'Almox · ferramenta não devolvida',
    corpo: `${empresa}: ferramentas não devolvidas hoje somam ${formatarBRL(total)}. O valor será descontado na próxima medição.`,
    url: `/avisos/${aviso}`,
  }
}

export function notificacaoCancelamento(
  empresa: string,
  pecas: number,
  valor: number,
): Notificacao {
  return {
    titulo: 'Almox · desconto cancelado',
    corpo: `${empresa}: ${pecas} ${pecas === 1 ? 'ferramenta devolvida' : 'ferramentas devolvidas'}, desconto de ${formatarBRL(valor)} cancelado.`,
    url: '/avisos',
  }
}

export function notificacaoResumoProprios(pessoas: number): Notificacao {
  return {
    titulo: 'Almox · fechamento do dia',
    corpo: `${pessoas} ${pessoas === 1 ? 'pessoa da construtora ainda está' : 'pessoas da construtora ainda estão'} com ferramenta.`,
    url: '/fechamento',
  }
}

export function notificacaoOcorrencia(pessoa: string, quando: string): Notificacao {
  return {
    titulo: 'Almox · capacete usado por outra pessoa',
    corpo: `O capacete de ${pessoa} foi lido às ${formatarHora(quando)} por outra pessoa. Nada foi registrado.`,
    url: '/inicio',
  }
}
