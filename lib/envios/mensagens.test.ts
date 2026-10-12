import { describe, expect, it } from 'vitest'
import {
  emailAviso,
  emailCancelamento,
  escapar,
  notificacaoAviso,
  notificacaoOcorrencia,
  porPessoa,
  saudacao,
} from './mensagens'

const itens = [
  {
    pessoa: 'Hélio Moreira',
    tipo: 'Pá',
    codigo: 'PA-01',
    valor: 8900,
    desde: '2026-10-12T10:00:00Z',
  },
  {
    pessoa: 'Hélio Moreira',
    tipo: 'Pá',
    codigo: 'PA-02',
    valor: 8900,
    desde: '2026-10-12T10:00:00Z',
  },
  {
    pessoa: 'Paulo Ribeiro',
    tipo: 'Serra circular',
    codigo: 'SER-01',
    valor: 89000,
    desde: '2026-10-12T11:00:00Z',
  },
]
const aviso = {
  obra: 'Obra Demonstração',
  empresa: 'Fôrmas Ribeiro',
  dono: 'Roberto Ribeiro',
  encarregado: 'Paulo Ribeiro',
  data: '2026-10-12T23:59:00-03:00',
  itens,
  total: 106800,
}

describe('e-mail do aviso', () => {
  it('assunto, saudação, tabela por pessoa, total e regra do desconto (RN-13/14)', () => {
    const e = emailAviso(aviso)
    expect(e.assunto).toBe('Ferramentas não devolvidas · Fôrmas Ribeiro · 12/10')
    expect(e.texto).toContain('Olá, Roberto e Paulo.')
    expect(e.texto).toContain('- Hélio Moreira: Pá ×2 · R$ 178,00')
    expect(e.texto).toContain('Total para reposição: R$ 1.068,00')
    expect(e.texto).toContain('descontado na próxima medição da Fôrmas Ribeiro')
    expect(e.texto).toContain('o desconto é cancelado')
    expect(e.html).toContain('<b>descontado na próxima medição</b>')
    expect(e.texto).not.toContain('dias anteriores')
  })

  it('peça de dia anterior: avisa que é lembrete (mesmo valor)', () => {
    const e = emailAviso({
      ...aviso,
      itens: [{ ...itens[0]!, desde: '2026-10-10T19:40:00Z' }],
      total: 8900,
    })
    expect(e.texto).toContain('inclui peças de dias anteriores')
    expect(e.texto).toContain('Total para reposição: R$ 89,00')
  })

  it('nome com marcação vira texto no HTML', () => {
    const e = emailAviso({ ...aviso, empresa: '<script>x</script>' })
    expect(e.html).not.toContain('<script>')
    expect(e.html).toContain('&lt;script&gt;')
    expect(escapar(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;')
  })
})

describe('e-mail de cancelamento', () => {
  it('peças devolvidas, valor cancelado e o que continua em aberto', () => {
    const e = emailCancelamento({
      obra: 'Obra Demonstração',
      empresa: 'Fôrmas Ribeiro',
      dono: 'Roberto Ribeiro',
      encarregado: null,
      quando: '2026-10-13T11:20:00Z',
      devolvidas: [itens[0]!],
      emAberto: 97900,
    })
    expect(e.assunto).toBe('Desconto cancelado · Fôrmas Ribeiro · 13/10')
    expect(e.texto).toContain('Olá, Roberto.')
    expect(e.texto).toContain('às 08:20')
    expect(e.texto).toContain('Desconto cancelado: R$ 89,00')
    expect(e.texto).toContain('Continua em aberto para a próxima medição: R$ 979,00.')
  })

  it('tudo devolvido: nada em aberto', () => {
    const e = emailCancelamento({
      obra: 'O',
      empresa: 'Lumen',
      dono: null,
      encarregado: null,
      quando: '2026-10-13T11:20:00Z',
      devolvidas: [itens[0]!],
      emAberto: 0,
    })
    expect(e.texto).toContain('Olá.')
    expect(e.texto).toContain('Não há mais nenhum valor em aberto da Lumen.')
  })
})

describe('notificações e apoio', () => {
  it('texto da notificação do aviso igual ao protótipo', () => {
    expect(notificacaoAviso('Fôrmas Ribeiro', 106800, 'a1').corpo).toBe(
      'Fôrmas Ribeiro: ferramentas não devolvidas hoje somam R$ 1.068,00. O valor será descontado na próxima medição.',
    )
  })

  it('ocorrência na hora da obra', () => {
    expect(notificacaoOcorrencia('Hélio Moreira', '2026-10-12T10:05:00Z').corpo).toBe(
      'O capacete de Hélio Moreira foi lido às 07:05 por outra pessoa. Nada foi registrado.',
    )
  })

  it('agrupa por pessoa e saudação sem repetir', () => {
    expect(porPessoa(itens)).toEqual([
      { pessoa: 'Hélio Moreira', itens: 'Pá ×2', valor: 17800 },
      { pessoa: 'Paulo Ribeiro', itens: 'Serra circular', valor: 89000 },
    ])
    expect(saudacao('Paulo Ribeiro', 'Paulo Souza')).toBe('Olá, Paulo.')
  })
})
