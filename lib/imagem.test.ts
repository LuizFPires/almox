import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepararIcone } from './imagem'

// Ponto 13 do plano: URL temporária da imagem é liberada também quando a leitura falha.
describe('imagem que não abre', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('libera a URL temporária', async () => {
    const revogadas: string[] = []
    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:teste',
      revokeObjectURL: (u: string) => revogadas.push(u),
    })
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decode() {
          return Promise.reject(new Error('imagem estragada'))
        }
      },
    )
    await expect(prepararIcone(new Blob(['x']) as File)).rejects.toThrow('imagem estragada')
    expect(revogadas).toEqual(['blob:teste'])
  })
})
