import * as Sentry from '@sentry/nextjs'
import { opcoesSentry } from '@/lib/monitoramento/opcoes'

// Erros do navegador (celular e TV) para o Sentry, sem dado pessoal. Sem DSN, nem inicia
// (nada de instrumentação rodando à toa no celular).
const opcoes = opcoesSentry()
if (opcoes.enabled) Sentry.init(opcoes)

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
