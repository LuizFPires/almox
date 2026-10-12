import { describe, expect, it } from 'vitest'
import { usuarioDoCookie } from './sessao'

const ID = '0b7c1d2e-3f40-4a5b-8c6d-7e8f90a1b2c3'
const sessao = JSON.stringify({ access_token: 'x', user: { id: ID } })
const b64url = Buffer.from(sessao)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')

describe('usuarioDoCookie', () => {
  it('lê a sessão em base64 do @supabase/ssr', () => {
    expect(usuarioDoCookie(`almox_obra=1; sb-abc-auth-token=base64-${b64url}`)).toBe(ID)
  })

  it('junta os pedaços na ordem', () => {
    const valor = `base64-${b64url}`
    const meio = Math.floor(valor.length / 2)
    expect(
      usuarioDoCookie(
        `sb-abc-auth-token.1=${valor.slice(meio)}; sb-abc-auth-token.0=${valor.slice(0, meio)}`,
      ),
    ).toBe(ID)
  })

  it('aceita JSON em texto (codificado na URL)', () => {
    expect(usuarioDoCookie(`sb-abc-auth-token=${encodeURIComponent(sessao)}`)).toBe(ID)
  })

  it('sem sessão ou cookie estragado: null', () => {
    expect(usuarioDoCookie('')).toBeNull()
    expect(usuarioDoCookie('almox_obra=1')).toBeNull()
    expect(usuarioDoCookie('sb-abc-auth-token=base64-@@@')).toBeNull()
  })
})
