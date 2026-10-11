import { describe, expect, it } from 'vitest'
import { destinoSeguro } from './destino'

describe('destinoSeguro', () => {
  it('aceita caminhos internos', () => {
    expect(destinoSeguro('/estoque')).toBe('/estoque')
    expect(destinoSeguro('/lista?busca=joao')).toBe('/lista?busca=joao')
  })

  it('volta para o início quando não há destino ou ele é o próprio login', () => {
    expect(destinoSeguro(null)).toBe('/inicio')
    expect(destinoSeguro('')).toBe('/inicio')
    expect(destinoSeguro('/')).toBe('/inicio')
    expect(destinoSeguro('/login')).toBe('/inicio')
    expect(destinoSeguro('/auth/confirmar')).toBe('/inicio')
  })

  it('recusa endereços externos', () => {
    expect(destinoSeguro('https://golpe.exemplo')).toBe('/inicio')
    expect(destinoSeguro('//golpe.exemplo')).toBe('/inicio')
    expect(destinoSeguro('/\\golpe.exemplo')).toBe('/inicio')
    expect(destinoSeguro('javascript:alert(1)')).toBe('/inicio')
  })

  it('recusa caracteres de controle que o navegador apagaria', () => {
    expect(destinoSeguro('/\t/golpe.exemplo')).toBe('/inicio')
    expect(destinoSeguro('/\n/golpe.exemplo')).toBe('/inicio')
    expect(destinoSeguro('/\r\n/golpe.exemplo')).toBe('/inicio')
  })

  it('devolve o caminho normalizado', () => {
    expect(destinoSeguro('/lista/../estoque')).toBe('/estoque')
    expect(destinoSeguro('/./login')).toBe('/inicio')
  })
})
