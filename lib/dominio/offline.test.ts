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
})

describe('destinoDoEnvio', () => {
  it('sucesso sai da fila', () => {
    expect(destinoDoEnvio({ ok: true })).toEqual({ acao: 'enviado' })
  })

  it('sem rede ou erro do servidor: tenta depois', () => {
    expect(destinoDoEnvio({ ok: false })).toEqual({ acao: 'tentarDepois' })
    expect(destinoDoEnvio({ ok: false, codigo: 'PGRST301' })).toEqual({ acao: 'tentarDepois' })
    expect(destinoDoEnvio({ ok: false, codigo: '500' })).toEqual({ acao: 'tentarDepois' })
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
