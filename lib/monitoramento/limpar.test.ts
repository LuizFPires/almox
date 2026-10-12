import { describe, expect, it } from 'vitest'
import { limparEvento, mascarar, semQuery } from './limpar'

describe('mascarar', () => {
  it('tira e-mail, token hex e JWT', () => {
    expect(mascarar('falhou para dono@formas.com.br')).toBe('falhou para [e-mail]')
    expect(mascarar('token d0c468692c54be27b9c3310e814221ba809c recusado')).toBe(
      'token [token] recusado',
    )
    expect(mascarar('Bearer eyJhbGciOi.eyJzdWIiOi.assinatura')).toBe('Bearer [jwt]')
  })

  it('deixa uuid e texto comum', () => {
    const id = '0b7c1d2e-3f40-4a5b-8c6d-7e8f90a1b2c3'
    expect(mascarar(`pessoa ${id} não encontrada`)).toBe(`pessoa ${id} não encontrada`)
  })
})

describe('limparEvento', () => {
  it('remove usuário, cookies, cabeçalhos e query string', () => {
    const evento = limparEvento({
      user: { email: 'x@y.com', ip_address: '1.2.3.4' },
      server_name: 'maquina',
      request: {
        url: 'https://almox.app/tv/entrar?c=abcdef0123456789abcdef',
        cookies: { sb: 'x' },
        headers: { authorization: 'Bearer x' },
        query_string: 'c=abc',
        data: { senha: 'x' },
      },
      message: 'erro de a@b.com',
      exception: { values: [{ type: 'Error', value: 'token 0123456789abcdef0123 errado' }] },
      breadcrumbs: [
        { category: 'navigation', data: { from: '/login?volta=%2Fx', to: '/historico?pessoa=1' } },
      ],
    })
    expect(evento).toEqual({
      request: { url: 'https://almox.app/tv/entrar' },
      message: 'erro de [e-mail]',
      exception: { values: [{ type: 'Error', value: 'token [token] errado' }] },
      breadcrumbs: [{ category: 'navigation', data: { from: '/login', to: '/historico' } }],
    })
  })

  it('semQuery', () => {
    expect(semQuery('/campo#x')).toBe('/campo')
  })
})
