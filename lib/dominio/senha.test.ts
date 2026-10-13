import { describe, expect, it } from 'vitest'
import {
  gerarSenhaProvisoria,
  limparCodigo,
  MENSAGEM_MUITAS_TENTATIVAS,
  mensagemErroCodigo,
  mensagemErroLogin,
  mensagemErroNovaSenha,
  mensagemErroPedirCodigo,
  provouCodigoRecente,
  validarNovaSenha,
} from './senha'

describe('senha provisória', () => {
  it('tem 3 grupos de 4 caracteres sem letras ambíguas', () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarSenhaProvisoria()).toMatch(
        /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/,
      )
    }
  })

  it('usa a fonte de aleatoriedade recebida', () => {
    expect(gerarSenhaProvisoria(() => new Uint8Array(16))).toBe('AAAA-AAAA-AAAA')
    // byte 255 (fora do limite) é descartado; 1 = 'B'
    expect(
      gerarSenhaProvisoria(() => Uint8Array.from({ length: 16 }, (_, i) => (i % 2 ? 1 : 255))),
    ).toBe('BBBB-BBBB-BBBB')
  })

  it('não repete entre chamadas', () => {
    const senhas = new Set(Array.from({ length: 200 }, () => gerarSenhaProvisoria()))
    expect(senhas.size).toBe(200)
  })
})

describe('nova senha', () => {
  it('exige 10 caracteres e confirmação igual', () => {
    expect(validarNovaSenha('curta', 'curta')).toBe('Use pelo menos 10 caracteres.')
    expect(validarNovaSenha('uma-senha-boa', 'outra-senha')).toBe('As duas senhas não são iguais.')
    expect(validarNovaSenha('uma-senha-boa', 'uma-senha-boa')).toBeNull()
  })
})

describe('código do e-mail', () => {
  it('fica só com os 8 dígitos', () => {
    expect(limparCodigo(' 1234 5678 ')).toBe('12345678')
    expect(limparCodigo('123456789')).toBe('12345678')
    expect(limparCodigo('abc')).toBe('')
  })

  it('prova recente só com código do e-mail (otp/recovery) dentro de 15 min', () => {
    const agora = 1_000_000
    expect(provouCodigoRecente([{ method: 'recovery', timestamp: agora - 60 }], agora)).toBe(true)
    expect(provouCodigoRecente([{ method: 'recovery', timestamp: agora - 901 }], agora)).toBe(false)
    expect(provouCodigoRecente([{ method: 'password', timestamp: agora }], agora)).toBe(false)
    expect(provouCodigoRecente([{ method: 'otp', timestamp: agora - 10 }], agora)).toBe(true)
    expect(provouCodigoRecente([{ method: 'totp', timestamp: agora }], agora)).toBe(false)
    expect(provouCodigoRecente(undefined, agora)).toBe(false)
    expect(provouCodigoRecente(['recovery'], agora)).toBe(false)
  })
})

describe('mensagens do acesso', () => {
  it('login não revela se o e-mail existe e avisa excesso de tentativas', () => {
    expect(mensagemErroLogin({ code: 'invalid_credentials', status: 400 })).toBe(
      'E-mail ou senha incorretos.',
    )
    expect(mensagemErroLogin({ code: 'user_banned', status: 400 })).toBe(
      'E-mail ou senha incorretos.',
    )
    expect(mensagemErroLogin({ code: 'over_request_rate_limit', status: 429 })).toBe(
      MENSAGEM_MUITAS_TENTATIVAS,
    )
  })

  it('senha nova: fraca, vazada, repetida', () => {
    expect(mensagemErroNovaSenha({ code: 'weak_password', reasons: ['pwned'] })).toContain(
      'vazamentos',
    )
    expect(mensagemErroNovaSenha({ code: 'weak_password', reasons: ['length'] })).toContain('fraca')
    expect(mensagemErroNovaSenha({ code: 'same_password' })).toContain('diferente')
  })

  it('código: excesso de pedidos e código errado', () => {
    expect(mensagemErroPedirCodigo({ code: 'over_email_send_rate_limit', status: 429 })).toContain(
      'Aguarde 1 minuto',
    )
    expect(mensagemErroCodigo({ code: 'otp_expired', status: 403 })).toContain('vencido')
  })
})
