import type { NextConfig } from 'next'
import { CSP_APLICADA, montarCspCompleta } from './lib/seguranca/csp'

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Planilha do cadastro inicial (M11) vai por Server Action: até 5 MB (o padrão é 1 MB).
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async redirects() {
    return [{ source: '/', destination: '/inicio', permanent: false }]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Câmera só para o próprio app (leitura do QR e foto da avaria); o resto, desligado.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // A parte da CSP que não depende de script já vale; o resto só relata (onda 2 aplica).
          { key: 'Content-Security-Policy', value: CSP_APLICADA },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: montarCspCompleta({
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
              desenvolvimento: process.env.NODE_ENV === 'development',
            }),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig
