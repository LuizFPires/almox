// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Botao } from './Botao'
import { Contador } from './Contador'
import { IconeFerramenta } from './IconeFerramenta'
import { CHAVES_ICONE, ICONES_FERRAMENTA, ehChaveIcone } from './icones-ferramenta'

afterEach(cleanup)

describe('ícones de ferramenta', () => {
  it('tem os 13 ícones do protótipo', () => {
    expect(CHAVES_ICONE).toEqual([
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
    ])
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
    fireEvent.click(screen.getByRole('button', { name: 'Somar uma Pá' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tirar uma Pá' }))
    expect(onChange.mock.calls).toEqual([[2], [0]])
  })

  it('desabilita os botões nos limites', () => {
    render(<Contador valor={0} maximo={0} rotulo="Pá" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Tirar uma Pá' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Somar uma Pá' }).hasAttribute('disabled')).toBe(true)
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
