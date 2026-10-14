/**
 * Cookie de sessão só por HTTPS na Vercel (auditoria 13/10/2026, APP-06). Local e e2e rodam
 * em http://localhost, onde o WebKit recusa cookie `Secure`.
 */
export function opcoesCookieServidor() {
  return { secure: process.env.VERCEL === '1' }
}

export type AmbientePublico = {
  url: string
  chavePublica: string
}

type Fonte = Partial<
  Record<
    | 'NEXT_PUBLIC_SUPABASE_URL'
    | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    | 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    string
  >
>

/**
 * Lê URL e chave pública do Supabase. As variáveis são citadas por extenso para o
 * Next.js embuti-las no bundle do navegador. Falha com mensagem clara se faltarem.
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` é o nome antigo da chave pública: a integração do Supabase
 * com a Vercel pode gravar as prévias (banco de cada PR, Branching) com ele.
 */
export function lerAmbientePublico(
  fonte: Fonte = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): AmbientePublico {
  const url = fonte.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const chavePublica = (
    fonte.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fonte.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()
  const faltando = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !chavePublica && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)
  if (!url || !chavePublica) {
    throw new Error(`Variáveis do Supabase ausentes: ${faltando.join(', ')}. Veja .env.example.`)
  }
  return { url, chavePublica }
}
