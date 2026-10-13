import { describe, expect, it } from 'vitest'
import { buscarTodas, PAGINA } from './paginar'

/** Simula a API: corta em 1000 linhas por pedido. */
function api(total: number) {
  const pedidos: [number, number][] = []
  const pagina = async (de: number, ate: number) => {
    pedidos.push([de, ate])
    const fim = Math.min(ate + 1, total, de + PAGINA)
    return { data: Array.from({ length: Math.max(0, fim - de) }, (_, i) => de + i), error: null }
  }
  return { pagina, pedidos }
}

describe('buscarTodas', () => {
  it.each([0, 1, 999, 1000, 1001, 5234])('traz todas as %i linhas, sem repetir', async (total) => {
    const { pagina, pedidos } = api(total)
    const linhas = await buscarTodas(pagina, 'erro')
    expect(linhas).toHaveLength(total)
    expect(new Set(linhas).size).toBe(total)
    expect(pedidos).toHaveLength(Math.floor(total / PAGINA) + 1)
  })

  it('falha com a mensagem quando a API dá erro', async () => {
    await expect(
      buscarTodas(async () => ({ data: null, error: new Error('x') }), 'Não carregou.'),
    ).rejects.toThrow('Não carregou.')
  })
})
