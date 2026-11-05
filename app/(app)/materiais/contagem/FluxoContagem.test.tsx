// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaldoMaterial } from '@/lib/dominio/materiais'
import { FluxoContagem } from './FluxoContagem'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

const registrarContagem = vi.fn()
vi.mock('../acoes', () => ({
  registrarContagem: (...a: unknown[]) => registrarContagem(...a),
}))

const guardarNaFila = vi.fn()
vi.mock('@/lib/offline/banco', () => ({
  guardarNaFila: (...a: unknown[]) => guardarNaFila(...a),
}))

const cimento: SaldoMaterial = {
  id: 'm1',
  nome: 'Cimento CP-II',
  unidade: 'sc',
  saldo: 118,
  estoqueCheio: 200,
  aviso: null,
}

beforeEach(() => {
  registrarContagem.mockReset()
  guardarNaFila.mockReset()
  guardarNaFila.mockResolvedValue(undefined)
  window.localStorage.clear()
})
afterEach(cleanup)

async function contarERevisar() {
  await act(async () => {
    render(<FluxoContagem obraId="o1" usuarioId="u1" dia="2026-11-04" materiais={[cimento]} />)
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Contei de Cimento CP-II' }), {
    target: { value: '100' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar contagem' }))
  fireEvent.click(screen.getByRole('radio', { name: /Ajustar o saldo/ }))
}

describe('FluxoContagem: sem sinal vai para a fila do celular', () => {
  it('falha de rede: guarda a contagem com a chave da revisão', async () => {
    registrarContagem.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await contarERevisar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar contagem' }))
    })
    const enviada = registrarContagem.mock.calls[0]![0] as { chave: string }
    expect(guardarNaFila.mock.calls[0]![0]).toMatchObject({
      chave: enviada.chave,
      obra: 'o1',
      usuario: 'u1',
      tipo: 'material_contagem',
      modo: 'ajustar',
      itens: [{ materialId: 'm1', saldoVisto: 118, contado: 100 }],
      situacao: 'aguardando',
    })
    expect(screen.getByRole('status').textContent).toBe(
      'Guardado no celular. Envia quando tiver sinal.',
    )
    // O rascunho sai: a contagem já está guardada na fila.
    expect(window.localStorage.length).toBe(0)
  })

  it('sem conseguir guardar no celular: fica na revisão para repetir igual', async () => {
    registrarContagem.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    guardarNaFila.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    await contarERevisar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar contagem' }))
    })
    expect(screen.getByRole('alert').textContent).toBe(
      'Sem conexão. Toque em Confirmar contagem de novo: não duplica.',
    )
  })
})
