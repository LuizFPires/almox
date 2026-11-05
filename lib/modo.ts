import { cookies } from 'next/headers'
import { COOKIE_MODO, inicioDoModo } from './dominio/destino'

/** Início do último modo usado neste aparelho (para os `redirect` das Server Actions). */
export async function inicioDoUltimoModo(): Promise<'/inicio' | '/materiais'> {
  return inicioDoModo((await cookies()).get(COOKIE_MODO)?.value)
}
