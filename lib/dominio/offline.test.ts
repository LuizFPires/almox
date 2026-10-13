import { describe, expect, it } from 'vitest'
import {
  destinoDoEnvio,
  livresComFila,
  normalizarToken,
  podeDevolver,
  possesComFila,
  textoFila,
  type ItemFila,
} from './offline'

function item(parcial: Partial<ItemFila>): ItemFila {
  return {
    chave: crypto.randomUUID(),
    obra: 'o',
    usuario: 'u',
    tipo: 'retirada',
    pessoa: 'p1',
    pessoaNome: 'Zé',
    token: 'abc',
    itens: [],
    quando: '2026-10-12T10:00:00.000Z',
    situacao: 'aguardando',
    ...parcial,
  }
}

describe('livresComFila', () => {
  const tipos = [
    { id: 'pa', nome: 'Pá', icone: 'pa', altoValor: false, livres: 3 },
    { id: 'fur', nome: 'Furadeira', icone: 'furadeira', altoValor: true, livres: 1 },
  ]

  it('desconta retiradas e soma devoluções aguardando', () => {
    const fila = [
      item({ itens: [{ tipo: 'pa', quantidade: 2 }] }),
      item({ tipo: 'devolucao', itens: [{ tipo: 'fur', quantidade: 1 }] }),
    ]
    expect(livresComFila(tipos, fila)).toEqual({ pa: 1, fur: 2 })
  })

  it('ignora recusados e nunca fica negativo', () => {
    const fila = [
      item({ itens: [{ tipo: 'pa', quantidade: 5 }] }),
      item({ itens: [{ tipo: 'fur', quantidade: 1 }], situacao: 'recusado' }),
    ]
    expect(livresComFila(tipos, fila)).toEqual({ pa: 0, fur: 1 })
  })
})

describe('possesComFila', () => {
  const dados = {
    posses: [
      { pessoa: 'p1', tipo: 'pa', via: 'qr' as const, quantidade: 1 },
      { pessoa: 'p1', tipo: 'pa', via: 'manual' as const, quantidade: 1 },
      { pessoa: 'p2', tipo: 'pa', via: 'qr' as const, quantidade: 4 },
    ],
  }

  it('soma o que a pessoa tem com o que retirou na fila', () => {
    const fila = [item({ itens: [{ tipo: 'pa', quantidade: 2 }] })]
    expect(possesComFila(dados, fila, 'p1')).toEqual({ pa: { total: 4, semQr: 1 } })
  })

  it('retirada manual na fila pode voltar sem QR; devolução tira da conta', () => {
    const fila = [
      item({ token: null, itens: [{ tipo: 'pa', quantidade: 1 }] }),
      item({
        tipo: 'devolucao',
        quando: '2026-10-12T11:00:00.000Z',
        itens: [{ tipo: 'pa', quantidade: 2 }],
      }),
    ]
    const r = possesComFila(dados, fila, 'p1')
    expect(r.pa?.total).toBe(1)
    expect(podeDevolver(r.pa, true)).toBe(1)
    expect(podeDevolver(r.pa, false)).toBeLessThanOrEqual(1)
  })

  it('sem nada com a pessoa: zero', () => {
    expect(podeDevolver(possesComFila(dados, [], 'p9').pa, true)).toBe(0)
  })

  // Igual ao servidor: com QR volta a mais antiga, seja qual for a via (ponto 5 do plano).
  const porPeca = {
    posses: [
      {
        pessoa: 'p1',
        tipo: 'pa',
        via: 'qr' as const,
        quantidade: 1,
        desde: '2026-10-12T09:00:00Z',
      },
      {
        pessoa: 'p1',
        tipo: 'pa',
        via: 'manual' as const,
        quantidade: 1,
        desde: '2026-10-12T07:00:00Z',
      },
    ],
  }

  it('manual antiga + QR recente: devolver 1 com QR leva a manual (a mais antiga)', () => {
    const fila = [item({ tipo: 'devolucao', itens: [{ tipo: 'pa', quantidade: 1 }] })]
    const r = possesComFila(porPeca, fila, 'p1')
    expect(r.pa).toEqual({ total: 1, semQr: 0 })
    // O celular não oferece mais a devolução sem QR que o servidor recusaria (AL004).
    expect(podeDevolver(r.pa, false)).toBe(0)
  })

  it('QR antiga + manual recente: devolver 1 com QR leva a do QR; a manual ainda volta sem QR', () => {
    const invertido = {
      posses: [
        { ...porPeca.posses[0]!, desde: '2026-10-12T07:00:00Z' },
        { ...porPeca.posses[1]!, desde: '2026-10-12T09:00:00Z' },
      ],
    }
    const fila = [item({ tipo: 'devolucao', itens: [{ tipo: 'pa', quantidade: 1 }] })]
    expect(possesComFila(invertido, fila, 'p1').pa).toEqual({ total: 1, semQr: 1 })
  })

  it('sem QR leva só manuais; retiradas da fila entram depois das que já estão com ela', () => {
    const fila = [
      item({
        token: null,
        quando: '2026-10-12T10:00:00.000Z',
        itens: [{ tipo: 'pa', quantidade: 2 }],
      }),
      item({
        tipo: 'devolucao',
        token: null,
        quando: '2026-10-12T11:00:00.000Z',
        itens: [{ tipo: 'pa', quantidade: 2 }],
      }),
      item({
        tipo: 'devolucao',
        quando: '2026-10-12T12:00:00.000Z',
        itens: [{ tipo: 'pa', quantidade: 1 }],
      }),
    ]
    // Tinha [manual 07h, qr 09h]; +2 manuais; -2 sem QR (manual 07h e manual 10h); -1 com QR (qr 09h).
    expect(possesComFila(porPeca, fila, 'p1').pa).toEqual({ total: 1, semQr: 1 })
  })

  it('devolução recusada não conta', () => {
    const fila = [
      item({ tipo: 'devolucao', situacao: 'recusado', itens: [{ tipo: 'pa', quantidade: 2 }] }),
    ]
    expect(possesComFila(porPeca, fila, 'p1').pa).toEqual({ total: 2, semQr: 1 })
  })
})

describe('destinoDoEnvio', () => {
  it('sucesso sai da fila', () => {
    expect(destinoDoEnvio({ ok: true })).toEqual({ acao: 'enviado' })
  })

  it('sem rede, sessão vencida ou limite: espera sem contar', () => {
    expect(destinoDoEnvio({ ok: false })).toEqual({ acao: 'tentarDepois', contar: false })
    expect(destinoDoEnvio({ ok: false, status: 401, codigo: 'PGRST301' })).toEqual({
      acao: 'tentarDepois',
      contar: false,
    })
    expect(destinoDoEnvio({ ok: false, status: 429 })).toEqual({
      acao: 'tentarDepois',
      contar: false,
    })
  })

  it('erro do servidor conta e, na 5ª vez, vira recusa (não trava a fila)', () => {
    expect(destinoDoEnvio({ ok: false, status: 500 }, 0)).toEqual({
      acao: 'tentarDepois',
      contar: true,
    })
    expect(destinoDoEnvio({ ok: false, status: 503 }, 4)).toMatchObject({ acao: 'recusado' })
  })

  it('outra resposta 4xx do item (ex.: erro de trigger, valor inválido): recusado', () => {
    expect(
      destinoDoEnvio({ ok: false, status: 400, codigo: 'P0001', mensagem: 'Regra X.' }),
    ).toEqual({ acao: 'recusado', erro: 'Regra X. Nada foi registrado.' })
    expect(destinoDoEnvio({ ok: false, status: 400, codigo: '22P02' })).toMatchObject({
      acao: 'recusado',
    })
  })

  it('regra de negócio: recusado com motivo claro', () => {
    const r = destinoDoEnvio({
      ok: false,
      codigo: 'AL002',
      mensagem: 'Pá acabou de sair: só 0 livre(s) agora.',
    })
    expect(r).toEqual({
      acao: 'recusado',
      erro: 'Pá acabou de sair: só 0 livre(s) agora. Nada foi registrado: confira com a pessoa e lance de novo.',
    })
    expect(destinoDoEnvio({ ok: false, codigo: 'AL012' })).toMatchObject({ acao: 'recusado' })
    expect(destinoDoEnvio({ ok: false, codigo: 'AL013' })).toMatchObject({
      erro: 'O QR lido não é o capacete desta pessoa. Nada foi registrado.',
    })
  })
})

describe('textos', () => {
  it('selo da fila', () => {
    expect(textoFila(0, 0)).toBeNull()
    expect(textoFila(3, 0)).toBe('3 aguardando envio')
    expect(textoFila(1, 1)).toBe('1 aguardando envio · 1 não enviado')
    expect(textoFila(0, 2)).toBe('2 não enviados')
  })

  it('token normalizado como no servidor', () => {
    expect(normalizarToken('  ABCdef \n')).toBe('abcdef')
  })
})
