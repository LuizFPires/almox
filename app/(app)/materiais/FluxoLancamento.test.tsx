// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaldoMaterial } from '@/lib/dominio/materiais'
import { FluxoLancamento } from './FluxoLancamento'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const registrarSaida = vi.fn()
vi.mock('./acoes', () => ({
  registrarSaida: (...a: unknown[]) => registrarSaida(...a),
  registrarEntrada: vi.fn(),
  pedirCadastro: vi.fn(),
}))

const cimento: SaldoMaterial = {
  id: 'm1',
  nome: 'Cimento CP-II',
  unidade: 'sc',
  saldo: 118,
  estoqueCheio: 200,
  aviso: null,
}

type Envio = { materialId: string; quantidade: number; chave: string }

beforeEach(() => {
  registrarSaida.mockReset()
  push.mockReset()
})
afterEach(cleanup)

function montar() {
  render(
    <FluxoLancamento
      tipo="saida"
      materiais={[cimento]}
      ordemMaisUsados={[]}
      podeCadastrar={false}
      quem="Marcos"
    />,
  )
}

const campo = () => screen.getByRole('textbox', { name: 'Quantidade' }) as HTMLInputElement
const abrirCimento = () => fireEvent.click(screen.getByRole('button', { name: /Cimento CP-II/ }))

async function registrar() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Registrar saída' }))
  })
}

describe('FluxoLancamento: falha de rede', () => {
  it('trava a quantidade, mantém a chave ao reabrir e reenvia igual', async () => {
    registrarSaida.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar()
    abrirCimento()
    fireEvent.change(campo(), { target: { value: '100' } })
    await registrar()

    expect(campo().disabled).toBe(true)
    const rapido = screen.getByRole('button', { name: '+10' }) as HTMLButtonElement
    expect(rapido.disabled).toBe(true)
    expect(screen.getByText('Sem sinal. Toque de novo para enviar a mesma quantidade.')).toBeTruthy()
    const primeira = registrarSaida.mock.calls[0]![0] as Envio

    // Fecha e reabre o mesmo material: continua travado com a mesma quantidade.
    fireEvent.keyDown(document, { key: 'Escape' })
    abrirCimento()
    expect(campo().value).toBe('100')
    expect(campo().disabled).toBe(true)

    registrarSaida.mockResolvedValueOnce({ ok: true, id: 'mov-1', aviso: false })
    await registrar()
    const segunda = registrarSaida.mock.calls[1]![0] as Envio
    expect(segunda).toEqual({ materialId: 'm1', quantidade: 100, chave: primeira.chave })
    expect(push).toHaveBeenCalledWith('/materiais/pronto?tipo=saida&id=mov-1&q=100&aviso=0')
  })

  it('erro de negócio destrava, mostra o erro e mexer na quantidade o limpa', async () => {
    registrarSaida.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar()
    abrirCimento()
    fireEvent.change(campo(), { target: { value: '100' } })
    await registrar()
    registrarSaida.mockResolvedValueOnce({ ok: false, erro: 'Só tem 18 sc no almox.' })
    await registrar()

    expect(campo().disabled).toBe(false)
    expect(screen.getByRole('alert').textContent).toBe('Só tem 18 sc no almox.')
    fireEvent.change(campo(), { target: { value: '10' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
