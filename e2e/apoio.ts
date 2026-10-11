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
  await page.getByLabel('Senha').fill(SENHA_SEED)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === destino)
  await expect(page.getByRole('link', { name: /conta e obra/ })).toBeVisible()
}
