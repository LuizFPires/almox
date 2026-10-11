'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_OBRA, obterSessao } from '@/lib/sessao'

/** Troca a obra ativa. Só aceita obras às quais o usuário tem acesso. */
export async function escolherObra(form: FormData) {
  const obraId = String(form.get('obra') ?? '')
  const { obras } = await obterSessao()
  if (!obras.some((o) => o.id === obraId)) redirect('/conta')

  ;(await cookies()).set(COOKIE_OBRA, obraId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/inicio')
}
