import { defineConfig, devices } from '@playwright/test'

const PORTA = 3200
const noCI = !!process.env.CI
// Com E2E_BASE_URL (ex.: https://almox-controle.vercel.app) os testes rodam contra o deploy.
const urlExterna = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  reporter: noCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: urlExterna ?? `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'tv', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: urlExterna
    ? undefined
    : {
        // No CI o build já foi feito no passo anterior.
        command: noCI
          ? `npm run start -- -p ${PORTA}`
          : `npm run build && npm run start -- -p ${PORTA}`,
        url: `http://localhost:${PORTA}/inicio`,
        reuseExistingServer: !noCI,
        timeout: 180_000,
      },
})
