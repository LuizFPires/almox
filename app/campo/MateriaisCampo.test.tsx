// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItemFila, MaterialOffline } from '@/lib/dominio/offline'
import { MateriaisCampo } from './MateriaisCampo'

const guardarNaFila = vi.fn()
vi.mock('@/lib/offline/banco', () => ({
  guardarNaFila: (...a: unknown[]) => guardarNaFila(...a),
}))

const cimento: MaterialOffline = {
  id: 'm1',
  nome: 'Cimento CP-II',
  unidade: 'sc',
  saldo: 118,
  estoque_cheio: 200,
  aviso_tipo: 'quantidade',
  aviso_valor: 20,
}
const saidaNaFila: ItemFila = {
  chave: 'k1',
  obra: 'o1',
  usuario: 'u1',
  tipo: 'material_saida',
  material: 'm1',
  quantidade: 100,
  quando: '2026-11-04T10:00:00.000Z',
  situacao: 'aguardando',
}

const aoGuardar = vi.fn()
beforeEach(() => {
  guardarNaFila.mockReset()
  guardarNaFila.mockResolvedValue(undefined)
  aoGuardar.mockReset()
})
afterEach(cleanup)

function montar(fila: ItemFila[] = []) {
  render(
    <MateriaisCampo
      obra="o1"
      usuario="u1"
      materiais={[cimento]}
      fila={fila}
      aoGuardar={aoGuardar}
    />,
  )
}
const campo = () => screen.getByRole('textbox', { name: 'Quantidade' })
const botaoSaida = () =>
  screen.getByRole('button', { name: 'Registrar saída' }) as HTMLButtonElement

describe('MateriaisCampo: material sem internet', () => {
  it('saída vai para a fila do celular (sem servidor) e avisa a tela', async () => {
    montar()
    expect(screen.getByText('Contagem precisa de sinal para abrir.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Saída de Cimento CP-II' }))
    fireEvent.change(campo(), { target: { value: '30' } })
    await act(async () => fireEvent.click(botaoSaida()))

    expect(guardarNaFila).toHaveBeenCalledTimes(1)
    const item = guardarNaFila.mock.calls[0]![0] as Record<string, unknown>
    expect(item).toMatchObject({
      obra: 'o1',
      usuario: 'u1',
      tipo: 'material_saida',
      material: 'm1',
      materialNome: 'Cimento CP-II',
      quantidade: 30,
      situacao: 'aguardando',
    })
    expect(typeof item.chave).toBe('string')
    expect(aoGuardar).toHaveBeenCalledWith('Saída guardada', '−30 sc · Cimento CP-II')
  })

  it('saldo local conta a fila: mais que o saldo trava o botão', () => {
    montar([saidaNaFila])
    expect(screen.getByText('saldo 18 sc')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Saída de Cimento CP-II' }))
    fireEvent.change(campo(), { target: { value: '20' } })
    expect(botaoSaida().disabled).toBe(true)
    expect(screen.getByText(/Só tem 18 sc no almox/)).toBeTruthy()
    fireEvent.change(campo(), { target: { value: '10' } })
    expect(botaoSaida().disabled).toBe(false)
  })

  it('aviso de limite usa os dados baixados: 118 → 18 cruza o limite de 20', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Saída de Cimento CP-II' }))
    fireEvent.change(campo(), { target: { value: '100' } })
    expect(screen.getByText(/Fica abaixo do limite de 20/)).toBeTruthy()
  })

  it('entrada passa pela conferência antes de guardar; busca sem acento', async () => {
    montar()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar material' }), {
      target: { value: 'CIMENTO' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrada de Cimento CP-II' }))
    fireEvent.change(campo(), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(guardarNaFila).not.toHaveBeenCalled()
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' })),
    )
    expect(guardarNaFila.mock.calls[0]![0]).toMatchObject({
      tipo: 'material_entrada',
      quantidade: 10,
    })
    expect(aoGuardar).toHaveBeenCalledWith('Entrada guardada', '+10 sc · Cimento CP-II')
  })
})
