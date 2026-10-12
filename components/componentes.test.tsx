// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Botao } from './Botao'
import { Contador } from './Contador'
import { IconeFerramenta } from './IconeFerramenta'
import {
  CHAVES_ICONE,
  GRUPOS_ICONE,
  ICONES_FERRAMENTA,
  ehChaveIcone,
  ehIcone,
} from './icones-ferramenta'

afterEach(cleanup)

describe('ícones de ferramenta', () => {
  it('mantém os 13 ícones do protótipo e cada um tem grupo', () => {
    for (const chave of [
      'pa',
      'enxada',
      'carrinho',
      'colher',
      'regua',
      'linha',
      'furadeira',
      'martelete',
      'esmerilhadeira',
      'serra_circular',
      'martelo',
      'escada',
      'extensao',
    ]) {
      expect(CHAVES_ICONE).toContain(chave)
    }
    for (const chave of CHAVES_ICONE)
      expect(GRUPOS_ICONE[ICONES_FERRAMENTA[chave].grupo]).toBeTruthy()
  })

  it('a constraint do banco aceita exatamente as chaves do código', () => {
    const sql = readFileSync('supabase/migrations/20261013040000_icone_proprio.sql', 'utf8')
    const lista = sql.slice(sql.indexOf('icone in ('), sql.indexOf(')', sql.indexOf('icone in (')))
    const doBanco = [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(doBanco.toSorted()).toEqual([...CHAVES_ICONE].toSorted())
  })

  it('reconhece ícone próprio só no formato do Storage', () => {
    expect(
      ehIcone(
        'arquivo:a0000000-0000-4000-8000-000000000001/e8000000-0000-4000-8000-000000000001.png',
      ),
    ).toBe(true)
    expect(ehIcone('arquivo:https://exemplo.com/x.png')).toBe(false)
    expect(ehIcone('pa')).toBe(true)
  })

  it('reconhece só chaves válidas', () => {
    expect(ehChaveIcone('pa')).toBe(true)
    expect(ehChaveIcone('toString')).toBe(false)
  })

  it('sempre escreve o nome embaixo do ícone', () => {
    render(<IconeFerramenta icone="serra_circular" />)
    expect(screen.getByText(ICONES_FERRAMENTA.serra_circular.nome)).toBeDefined()
    render(<IconeFerramenta icone="pa" nome="Pá de bico" />)
    expect(screen.getByText('Pá de bico')).toBeDefined()
  })
})

describe('Contador', () => {
  it('soma e tira dentro dos limites', () => {
    const onChange = vi.fn()
    render(<Contador valor={1} maximo={2} rotulo="Pá" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Pá' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Pá' }))
    expect(onChange.mock.calls).toEqual([[2], [0]])
  })

  it('desabilita os botões nos limites', () => {
    render(<Contador valor={0} maximo={0} rotulo="Pá" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Diminuir Pá' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Aumentar Pá' }).hasAttribute('disabled')).toBe(true)
  })
})

describe('Botao', () => {
  it('é um <button type="button"> por padrão', () => {
    render(<Botao>Retirada</Botao>)
    const botao = screen.getByRole('button', { name: 'Retirada' })
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('type')).toBe('button')
  })
})
