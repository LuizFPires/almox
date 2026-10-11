import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { destinoSeguro } from '@/lib/dominio/destino'
import { criarClienteServidor } from '@/lib/supabase/servidor'

const TIPOS: EmailOtpType[] = ['magiclink', 'invite', 'email', 'recovery', 'signup', 'email_change']

/** Retorno do link mágico e de convites: troca o código por uma sessão. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const destino = destinoSeguro(searchParams.get('volta'))
  const codigo = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const tipoRecebido = searchParams.get('type')
  const tipo = TIPOS.includes(tipoRecebido as EmailOtpType) ? (tipoRecebido as EmailOtpType) : null
  const supabase = await criarClienteServidor()

  const { error } = codigo
    ? await supabase.auth.exchangeCodeForSession(codigo)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error('link sem código') }

  // destino pode trazer query (ex.: /lista?busca=joao): resolve como URL relativa.
  const url = new URL(error ? '/login?erro=link' : destino, request.nextUrl.origin)
  return NextResponse.redirect(url)
}
