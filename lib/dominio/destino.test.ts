import { describe, expect, it } from 'vitest'
import { destinoSeguro, inicioDoModo } from './destino'

describe('destinoSeguro', () => {
  it('aceita caminhos internos', () => {
    expect(destinoSeguro('/estoque')).toBe('/estoque')
    expect(destinoSeguro('/lista?busca=joao')).toBe('/lista?busca=joao')
  })

  it('volta para o início quando não há destino ou ele é o próprio login', () => {
    expect(destinoSeguro(null)).toBe('/')
    expect(destinoSeguro('')).toBe('/')
    expect(destinoSeguro('/')).toBe('/')
    expect(destinoSeguro('/login')).toBe('/')
    expect(destinoSeguro('/auth/confirmar')).toBe('/')
  })

  it('recusa endereços externos', () => {
    expect(destinoSeguro('https://golpe.exemplo')).toBe('/')
    expect(destinoSeguro('//golpe.exemplo')).toBe('/')
    expect(destinoSeguro('/\\golpe.exemplo')).toBe('/')
    expect(destinoSeguro('javascript:alert(1)')).toBe('/')
  })

  it('recusa caracteres de controle que o navegador apagaria', () => {
    expect(destinoSeguro('/\t/golpe.exemplo')).toBe('/')
    expect(destinoSeguro('/\n/golpe.exemplo')).toBe('/')
    expect(destinoSeguro('/\r\n/golpe.exemplo')).toBe('/')
  })

  it('devolve o caminho normalizado', () => {
    expect(destinoSeguro('/lista/../estoque')).toBe('/estoque')
    expect(destinoSeguro('/./login')).toBe('/')
    expect(destinoSeguro('/.//golpe.exemplo')).toBe('/')
    expect(destinoSeguro('/a/..//golpe.exemplo')).toBe('/')
    expect(destinoSeguro('/%2e//golpe.exemplo')).toBe('/')
  })
})

describe('inicioDoModo', () => {
  it('abre Materiais só com o cookie de materiais; o resto vai para Ferramentas', () => {
    expect(inicioDoModo('materiais')).toBe('/materiais')
    expect(inicioDoModo('ferramentas')).toBe('/inicio')
    expect(inicioDoModo(undefined)).toBe('/inicio')
    expect(inicioDoModo('qualquer')).toBe('/inicio')
  })
})
