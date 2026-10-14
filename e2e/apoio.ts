import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

/** Usuários do supabase/seed.sql (só desenvolvimento e CI). */
export const USUARIOS = {
  engenheiro: 'engenheiro@almox.exemplo',
  almoxarife: 'almoxarife@almox.exemplo',
  mestre: 'mestre@almox.exemplo',
  formas: 'formas@almox.exemplo',
} as const

export const SENHA_SEED = 'almox-dev-2026'

/** Testes que dependem do seed não rodam contra um deploy (E2E_BASE_URL). */
export const semSeed = Boolean(process.env.E2E_BASE_URL)

export async function entrarComo(page: Page, usuario: keyof typeof USUARIOS, destino = '/inicio') {
  await page.goto(destino === '/inicio' ? '/login' : `/login?volta=${encodeURIComponent(destino)}`)
  await page.getByLabel('E-mail').fill(USUARIOS[usuario])
  await page.getByLabel('Senha', { exact: true }).fill(SENHA_SEED)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === destino)
  await expect(page.getByRole('link', { name: /conta e obra/ })).toBeVisible()
}

/** URL e chave pública do Supabase local (o CI gera o .env.local antes do build). */
export function ambiente() {
  const linhas = readFileSync('.env.local', 'utf8').split('\n')
  // `supabase status -o env` grava os valores entre aspas; o Next tira, aqui também.
  const valor = (chave: string) =>
    (linhas.find((l) => l.startsWith(`${chave}=`))?.slice(chave.length + 1) ?? '')
      .trim()
      .replace(/^"(.*)"$/, '$1')
  return {
    url: valor('NEXT_PUBLIC_SUPABASE_URL'),
    chave: valor('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    /** Segredo do processador de envios (/api/envios), M9. */
    segredoEnvios: valor('ENVIOS_SEGREDO'),
    /** Chave secreta do Supabase LOCAL (só para preparar dados que o app não cria, ex.: obra). */
    chaveSecreta: valor('SUPABASE_SECRET_KEY'),
  }
}
