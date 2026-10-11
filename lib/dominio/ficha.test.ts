import { describe, expect, it } from 'vitest'
import { contarItens, ehPendencia, regraDevolucao, textoDesde, textoIdentificacao } from './ficha'

const agora = new Date('2026-10-11T12:00:00Z') // 09:00 em São Paulo

describe('identificação na ficha', () => {
  it('QR conferido em verde', () => {
    expect(textoIdentificacao('qr', true, true)).toEqual({
      texto: 'QR do capacete · pessoa conferida',
      tom: 'sucesso',
    })
  })

  it('QR sem conferência vigente conta como lista para quem lança', () => {
    expect(textoIdentificacao('qr', true, false).texto).toBe('Aberto pela lista')
  })

  it('consulta: QR lido, sem conferência', () => {
    expect(textoIdentificacao('qr', false, false).texto).toBe('QR do capacete lido')
  })

  it('manual em vermelho; lista em cinza', () => {
    expect(textoIdentificacao('manual', true, false)).toEqual({
      texto: 'Escolhido na lista · sem QR',
      tom: 'erro',
    })
    expect(textoIdentificacao('lista', true, false).tom).toBe('neutro')
  })
})

describe('devolução (RN-02/RN-06)', () => {
  it('com o capacete conferido devolve tudo', () => {
    expect(regraDevolucao(['qr', 'manual'], true, 'Joaquim Silva').permitida).toBe(true)
  })

  it('sem QR e tudo saiu com QR: não devolve, pede o capacete', () => {
    const r = regraDevolucao(['qr', 'qr'], false, 'Joaquim Silva')
    expect(r.permitida).toBe(false)
    expect(r.pedirCapacete).toBe(true)
    expect(r.aviso).toBe(
      'Devolução só com o capacete de quem pegou. As ferramentas estão no nome do Joaquim: ele mesmo precisa vir devolver.',
    )
  })

  it('sem QR e parte manual: devolve só o manual, avisa e pede o capacete', () => {
    const r = regraDevolucao(['qr', 'manual'], false, 'Joaquim Silva')
    expect(r.permitida).toBe(true)
    expect(r.aviso).toMatch(/^Sem o QR, Joaquim só devolve o que pegou sem QR/)
  })

  it('sem QR e tudo manual: devolve sem aviso', () => {
    expect(regraDevolucao(['manual'], false, 'Joaquim')).toEqual({
      permitida: true,
      aviso: null,
      pedirCapacete: false,
    })
  })

  it('sem nada com ele: nada a devolver', () => {
    expect(regraDevolucao([], true, 'Joaquim').permitida).toBe(false)
  })
})

describe('pendência e horário', () => {
  it('hoje não é pendência; ontem é', () => {
    expect(ehPendencia('2026-10-11T10:30:00Z', agora)).toBe(false)
    expect(ehPendencia('2026-10-10T19:40:00Z', agora)).toBe(true)
  })

  it('vira o dia pelo fuso de São Paulo, não pelo UTC', () => {
    // 01:30 UTC de 11/10 = 22:30 de 10/10 em São Paulo
    expect(ehPendencia('2026-10-11T01:30:00Z', agora)).toBe(true)
    // 02:59 UTC = 23:59 do dia 10; 03:00 UTC = 00:00 do dia 11
    expect(ehPendencia('2026-10-11T02:59:00Z', agora)).toBe(true)
    expect(ehPendencia('2026-10-11T03:00:00Z', agora)).toBe(false)
  })

  it('textos de "desde"', () => {
    expect(textoDesde('2026-10-11T10:30:00Z', agora)).toBe('desde 07:30')
    expect(textoDesde('2026-10-10T19:40:00Z', agora)).toBe('desde ontem 16:40')
    expect(textoDesde('2026-10-08T12:00:00Z', agora)).toBe('desde 08/10')
  })

  it('contagem de itens', () => {
    expect(contarItens(0)).toBe('nada')
    expect(contarItens(1)).toBe('1 item')
    expect(contarItens(3)).toBe('3 itens')
  })
})
