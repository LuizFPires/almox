// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SaldoMaterial } from '@/lib/dominio/materiais'
import { GavetaQuantidade } from './GavetaQuantidade'

afterEach(cleanup)

const cimento: SaldoMaterial = {
  id: 'm1',
  nome: 'Cimento CP-II',
  unidade: 'sc',
  saldo: 118,
  estoqueCheio: 200,
  aviso: { tipo: 'quantidade', valor: 20 },
}

function abrir(tipo: 'entrada' | 'saida', material: SaldoMaterial = cimento) {
  const onFechar = vi.fn()
  const onConfirmar = vi.fn()
  render(
    <GavetaQuantidade
      tipo={tipo}
      material={material}
      aberta
      ocupado={false}
      onFechar={onFechar}
      onConfirmar={onConfirmar}
    />,
  )
  const campo = screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement
  return { onFechar, onConfirmar, campo }
}

describe('GavetaQuantidade', () => {
  it('é um diálogo modal com o tipo e o nome do material', () => {
    abrir('saida')
    const dialogo = screen.getByRole('dialog')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(dialogo.textContent).toContain('Saída')
    expect(dialogo.textContent).toContain('Cimento CP-II')
    expect(screen.getByText('Toque no número para digitar')).toBeTruthy()
  })

  it('digitar "1.500" e tocar em +500 mostra "2.000"', () => {
    const { campo } = abrir('entrada')
    fireEvent.change(campo, { target: { value: '1.500' } })
    fireEvent.click(screen.getByRole('button', { name: '+500' }))
    expect(campo.value).toBe('2.000')
  })

  it('mantém o texto digitado e reformata ao sair do campo', () => {
    const { campo } = abrir('entrada')
    fireEvent.focus(campo)
    fireEvent.change(campo, { target: { value: '1500' } })
    expect(campo.value).toBe('1500')
    fireEvent.blur(campo)
    expect(campo.value).toBe('1.500')
  })

  it('− e + mudam de 1 em 1', () => {
    const { campo } = abrir('entrada')
    fireEvent.click(screen.getByRole('button', { name: 'Mais um' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais um' }))
    fireEvent.click(screen.getByRole('button', { name: 'Menos um' }))
    expect(campo.value).toBe('1')
  })

  it('saída maior que o saldo desliga o botão e avisa "Só tem 118"', () => {
    const { campo } = abrir('saida')
    fireEvent.change(campo, { target: { value: '119' } })
    expect(screen.getByText(/Só tem 118 sc no almox/)).toBeTruthy()
    const botao = screen.getByRole('button', { name: 'Registrar saída' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
  })

  it('saída que cruza o limite avisa "Fica abaixo do limite de 20"', () => {
    const { campo } = abrir('saida')
    fireEvent.change(campo, { target: { value: '100' } })
    expect(screen.getByText(/Fica abaixo do limite de 20/)).toBeTruthy()
    expect(screen.getByText(/Saldo: 118 →/)).toBeTruthy()
  })

  it('saída válida chama onConfirmar direto', () => {
    const { campo, onConfirmar } = abrir('saida')
    fireEvent.change(campo, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar saída' }))
    expect(onConfirmar).toHaveBeenCalledWith(10)
  })

  it('botão desligado sem quantidade ou com vírgula em unidade inteira', () => {
    const { campo } = abrir('saida')
    const botao = screen.getByRole('button', { name: 'Registrar saída' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.change(campo, { target: { value: '2,5' } })
    expect(botao.disabled).toBe(true)
  })

  it('entrada: "Continuar" mostra a conferência e só ela confirma', () => {
    const { campo, onConfirmar } = abrir('entrada')
    fireEvent.change(campo, { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(onConfirmar).not.toHaveBeenCalled()
    expect(screen.getByText('+500 sc')).toBeTruthy()
    expect(screen.getByText(/O saldo vai ficar em/).textContent).toContain('618 sc')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }))
    expect(onConfirmar).toHaveBeenCalledWith(500)
  })

  it('"Corrigir" volta para a quantidade', () => {
    const { campo } = abrir('entrada')
    fireEvent.change(campo, { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }))
    const de_novo = screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement
    expect(de_novo.value).toBe('500')
  })

  it('Esc chama onFechar', () => {
    const { onFechar } = abrir('saida')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onFechar).toHaveBeenCalledTimes(1)
  })

  it('✕ e toque no fundo chamam onFechar', () => {
    const { onFechar } = abrir('saida')
    const fechar = screen.getAllByRole('button', { name: 'Fechar' })
    for (const b of fechar) fireEvent.click(b)
    expect(onFechar).toHaveBeenCalledTimes(fechar.length)
    expect(fechar.length).toBe(2)
  })
})
