import { describe, expect, it } from 'vitest'
import { podeGerarNovaSenha } from './nova-senha'

describe('nova senha pelo engenheiro', () => {
  const obra = 'obra-a'
  it('quem ainda não criou a senha: pode, qualquer perfil', () => {
    expect(
      podeGerarNovaSenha({ senhaPendente: true, perfil: 'engenheiro', obras: [obra] }, obra).pode,
    ).toBe(true)
  })
  it('almoxarife ou consulta que esqueceu a senha: pode', () => {
    expect(
      podeGerarNovaSenha({ senhaPendente: false, perfil: 'almoxarife', obras: [obra] }, obra).pode,
    ).toBe(true)
    expect(
      podeGerarNovaSenha({ senhaPendente: false, perfil: 'consulta', obras: [obra] }, obra).pode,
    ).toBe(true)
  })
  it('outro engenheiro com senha própria: só o administrador', () => {
    expect(
      podeGerarNovaSenha({ senhaPendente: false, perfil: 'engenheiro', obras: [obra] }, obra).pode,
    ).toBe(false)
  })
  it('login que também é de outra obra: só o administrador', () => {
    expect(
      podeGerarNovaSenha(
        { senhaPendente: true, perfil: 'almoxarife', obras: [obra, 'obra-b'] },
        obra,
      ).pode,
    ).toBe(false)
  })
})
