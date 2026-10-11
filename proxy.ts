import type { NextRequest } from 'next/server'
import { atualizarSessao } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  // Fora: arquivos estáticos, ícones, manifest, service worker e página offline.
  matcher: [
    '/((?!_next/static|_next/image|icones/|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|sw\\.js|offline\\.html|favicon\\.ico).*)',
  ],
}
