import { describe, expect, it } from 'vitest'
import { lerAmbientePublico } from './ambiente'

describe('lerAmbientePublico', () => {
  it('devolve URL e chave pública', () => {
    expect(
      lerAmbientePublico({
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_x ',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', chavePublica: 'sb_publishable_x' })
  })

  it('nomeia as variáveis que faltam, sem mostrar valores', () => {
    expect(() => lerAmbientePublico({ NEXT_PUBLIC_SUPABASE_URL: 'http://x' })).toThrow(
      'Variáveis do Supabase ausentes: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Veja .env.example.',
    )
    expect(() => lerAmbientePublico({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
  })

  it('aceita o nome antigo da chave pública (prévias do Branching)', () => {
    expect(
      lerAmbientePublico({
        NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'chave-antiga',
      }),
    ).toEqual({ url: 'https://abc.supabase.co', chavePublica: 'chave-antiga' })
  })
})
