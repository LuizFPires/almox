import { describe, expect, it } from 'vitest'
import {
  destinatariosAviso,
  montarFechamento,
  resumoFechamento,
  subtituloEncerrado,
  type PosseFechamento,
} from './fechamento'

const agora = new Date('2026-10-12T20:00:00Z') // 17:00 em São Paulo
const construtora = { nome: 'Construtora', cor: '#F4B400', propria: true }
const formas = { nome: 'Fôrmas Ribeiro', cor: '#FF8A3D', propria: false }
const posse = (
  pessoaId: string,
  pessoa: string,
  empresa: typeof construtora,
  tipo: string,
  valor: number,
  desde = '2026-10-12T10:00:00Z',
): PosseFechamento => ({ pessoaId, pessoa, empresa, tipo, valor, desde })

describe('fechamento do dia', () => {
  const posses = [
    posse('h', 'Hélio Moreira', formas, 'Pá', 8900),
    posse('h', 'Hélio Moreira', formas, 'Pá', 8900),
    posse('h', 'Hélio Moreira', formas, 'Martelo', 6500, '2026-10-12T09:00:00Z'),
    posse('r', 'Raimundo Alves', construtora, 'Martelete', 289000, '2026-10-10T19:40:00Z'),
  ]

  it('pendentes por pessoa: itens agrupados na ordem em que saíram, valor e desde ontem', () => {
    const f = montarFechamento(posses, [], agora)
    expect(f.unidadesFora).toBe(4)
    expect(f.pendentes).toEqual([
      {
        pessoaId: 'r',
        nome: 'Raimundo Alves',
        empresa: construtora,
        itens: 'Martelete ×1',
        valor: 289000,
        desdeOntem: true,
      },
      {
        pessoaId: 'h',
        nome: 'Hélio Moreira',
        empresa: formas,
        itens: 'Martelo ×1, Pá ×2',
        valor: 24300,
        desdeOntem: false,
      },
    ])
  })

  it('devolveram tudo hoje: só quem está sem nada agora', () => {
    const f = montarFechamento(
      posses,
      [
        {
          pessoaId: 'h',
          pessoa: 'Hélio Moreira',
          empresa: 'Fôrmas Ribeiro',
          quando: '2026-10-12T15:00:00Z',
        },
        {
          pessoaId: 'v',
          pessoa: 'Valter Gomes',
          empresa: 'Construtora',
          quando: '2026-10-12T16:05:00Z',
        },
      ],
      agora,
    )
    expect(f.devolveramTudo).toEqual([
      {
        pessoaId: 'v',
        nome: 'Valter Gomes',
        empresa: 'Construtora',
        quando: '2026-10-12T16:05:00Z',
      },
    ])
  })

  it('textos', () => {
    expect(resumoFechamento(0)).toBe('Todos devolveram')
    expect(resumoFechamento(1)).toBe('1 pessoa ainda com ferramenta')
    expect(resumoFechamento(3)).toBe('3 pessoas ainda com ferramenta')
    expect(subtituloEncerrado(0)).toBe('Sem pendências')
    expect(subtituloEncerrado(1)).toBe('1 pendência passa para amanhã')
    expect(subtituloEncerrado(2)).toBe('2 pendências passam para amanhã')
    expect(destinatariosAviso('Luciana Prado', 'Carlos Mendes')).toBe('Aviso a Luciana e Carlos')
    expect(destinatariosAviso('Bruno Teixeira', null)).toBe('Aviso a Bruno')
    expect(destinatariosAviso(null, null)).toBe('Sem e-mail cadastrado: aviso só no app')
  })
})
