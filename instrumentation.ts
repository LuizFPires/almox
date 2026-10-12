import * as Sentry from '@sentry/nextjs'
import { opcoesSentry } from '@/lib/monitoramento/opcoes'

/**
 * Erros do servidor (páginas, Server Actions, rotas) para o Sentry. Sem DSN, nem inicia: a
 * instrumentação do SDK deixa o servidor mais lento à toa.
 */
export function register() {
  const opcoes = opcoesSentry()
  if (opcoes.enabled) Sentry.init(opcoes)
}

export const onRequestError = Sentry.captureRequestError
