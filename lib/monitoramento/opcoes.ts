import { limparEvento } from './limpar'

/**
 * Opções do Sentry iguais no navegador e no servidor: só erros (sem rastreio de desempenho
 * nem gravação de tela), nenhum dado pessoal (limparEvento) e desligado sem o DSN.
 */
export function opcoesSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: <T>(evento: T) => limparEvento(evento),
    beforeBreadcrumb: <T>(migalha: T) =>
      limparEvento({ breadcrumbs: [migalha] }).breadcrumbs[0] ?? null,
  }
}
