// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetModules()
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_VERSAO_APP', 'abc1234')
})

async function montar(resposta: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => resposta })),
  )
  const { NovaVersao } = await import('./NovaVersao')
  await act(async () => {
    render(<NovaVersao />)
  })
}

describe('NovaVersao', () => {
  it('mostra a faixa com Atualizar quando o servidor tem outra versão', async () => {
    await montar({ versao: 'def5678' })
    expect(screen.getByRole('status').textContent).toContain('Tem uma versão nova do Almox.')
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeTruthy()
  })

  it('fica em silêncio na mesma versão', async () => {
    await montar({ versao: 'abc1234' })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('não avisa com resposta vazia', async () => {
    await montar({})
    expect(screen.queryByRole('status')).toBeNull()
  })
})
