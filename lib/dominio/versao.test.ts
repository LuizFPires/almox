import { describe, expect, it } from 'vitest'
import { precisaAtualizar } from './versao'

describe('precisaAtualizar', () => {
  it('avisa quando o servidor roda outra versão', () => {
    expect(precisaAtualizar('abc1234', 'def5678')).toBe(true)
  })

  it('não avisa na mesma versão', () => {
    expect(precisaAtualizar('abc1234', 'abc1234')).toBe(false)
  })

  it('ignora resposta vazia ou estranha (não força recarga à toa)', () => {
    expect(precisaAtualizar('abc1234', '')).toBe(false)
    expect(precisaAtualizar('abc1234', undefined)).toBe(false)
    expect(precisaAtualizar('abc1234', 42)).toBe(false)
    expect(precisaAtualizar('', 'def5678')).toBe(false)
  })
})
