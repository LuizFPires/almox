import * as Sentry from '@sentry/nextjs'
import { opcoesSentry } from '@/lib/monitoramento/opcoes'

/** Erros do servidor (páginas, Server Actions, rotas) para o Sentry. Sem DSN, desligado. */
export function register() {
  Sentry.init(opcoesSentry())
}

export const onRequestError = Sentry.captureRequestError
