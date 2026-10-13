import { describe, expect, it } from 'vitest'
import { ehRotaPublica } from './proxy'

describe('ehRotaPublica', () => {
  it('libera login, retorno do link mágico e TV', () => {
    expect(ehRotaPublica('/login')).toBe(true)
    expect(ehRotaPublica('/recuperar-senha')).toBe(true)
    expect(ehRotaPublica('/api/csp')).toBe(true)
    expect(ehRotaPublica('/auth/confirmar')).toBe(true)
    expect(ehRotaPublica('/tv')).toBe(true)
    expect(ehRotaPublica('/api/envios')).toBe(true)
    expect(ehRotaPublica('/api/outra')).toBe(false)
  })

  it('protege as telas do app', () => {
    expect(ehRotaPublica('/')).toBe(false)
    expect(ehRotaPublica('/inicio')).toBe(false)
    expect(ehRotaPublica('/cadastros')).toBe(false)
    expect(ehRotaPublica('/loginx')).toBe(false)
    expect(ehRotaPublica('/tvs')).toBe(false)
  })
})
