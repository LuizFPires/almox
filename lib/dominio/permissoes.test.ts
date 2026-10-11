import { describe, expect, it } from 'vitest'
import { podeCadastrar, podeLancar, rotuloPerfil } from './permissoes'

describe('permissões por perfil (PRD §5)', () => {
  it('engenheiro e almoxarife lançam; consulta não', () => {
    expect(podeLancar('engenheiro')).toBe(true)
    expect(podeLancar('almoxarife')).toBe(true)
    expect(podeLancar('consulta')).toBe(false)
  })

  it('só o engenheiro cadastra', () => {
    expect(podeCadastrar('engenheiro')).toBe(true)
    expect(podeCadastrar('almoxarife')).toBe(false)
    expect(podeCadastrar('consulta')).toBe(false)
  })

  it('rótulo mostra a empresa da consulta de empreiteira', () => {
    expect(rotuloPerfil('almoxarife')).toBe('Almoxarife')
    expect(rotuloPerfil('consulta')).toBe('Consulta')
    expect(rotuloPerfil('consulta', 'Fôrmas Ribeiro')).toBe('Consulta · Fôrmas Ribeiro')
    expect(rotuloPerfil('engenheiro', 'Ignorada')).toBe('Engenheiro')
  })
})
