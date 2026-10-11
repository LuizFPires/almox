import { describe, expect, it } from 'vitest'
import {
  FUSO_OBRA,
  diaDaObra,
  formatarData,
  formatarDataHora,
  formatarDiaCurto,
  formatarHora,
} from './datas'

// 11/10/2026 02:30 UTC = 10/10/2026 23:30 em São Paulo (UTC-3, sem horário de verão)
const virada = new Date('2026-10-11T02:30:00Z')
const manha = new Date('2026-10-11T10:05:00Z') // 07:05 em São Paulo

describe('datas no fuso da obra', () => {
  it('usa America/Sao_Paulo', () => {
    expect(FUSO_OBRA).toBe('America/Sao_Paulo')
  })

  it('formata data e hora como dd/MM/yyyy e HH:mm', () => {
    expect(formatarData(manha)).toBe('11/10/2026')
    expect(formatarHora(manha)).toBe('07:05')
    expect(formatarDataHora(manha)).toBe('11/10/2026 07:05')
  })

  it('respeita o fuso perto da meia-noite', () => {
    expect(formatarData(virada)).toBe('10/10/2026')
    expect(formatarHora(virada)).toBe('23:30')
    expect(diaDaObra(virada)).toBe('2026-10-10')
  })

  it('aceita string ISO vinda do banco', () => {
    expect(formatarDataHora('2026-10-11T10:05:00Z')).toBe('11/10/2026 07:05')
  })

  it('formata o dia curto do cabeçalho', () => {
    expect(formatarDiaCurto(manha)).toBe('dom 11/10')
  })

  it('recusa data inválida', () => {
    expect(() => formatarData('ontem')).toThrow()
  })
})
