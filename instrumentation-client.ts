import * as Sentry from '@sentry/nextjs'
import { opcoesSentry } from '@/lib/monitoramento/opcoes'

// Erros do navegador (celular e TV) para o Sentry, sem dado pessoal. Sem DSN, desligado.
Sentry.init(opcoesSentry())

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
