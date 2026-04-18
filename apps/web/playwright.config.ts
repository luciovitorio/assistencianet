import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

// Caminho onde o estado de autenticação ficará salvo
export const STORAGE_STATE = path.join(__dirname, '.auth/session.json')

export default defineConfig({
  testDir: './src/tests/e2e',

  // Timeout por teste (30s é suficiente para operações de UI simples)
  timeout: 30_000,

  // Timeout para expects individuais
  expect: { timeout: 8_000 },

  // Não roda em paralelo por padrão — evita conflito de dados no banco local
  workers: 1,
  fullyParallel: false,

  // Retenta 1x em CI, 0x localmente
  retries: process.env.CI ? 1 : 0,

  // Reporter
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    // Base URL — servidor Next.js dev (opção B: usuário deixa rodando)
    baseURL: 'http://localhost:3001',

    // Captura screenshot e trace apenas em falhas
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',

    // Viewport desktop (design-first conforme AGENTS.md)
    viewport: { width: 1280, height: 800 },
  },

  webServer: {
    command: 'npm run dev:e2e',
    cwd: __dirname,
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // ─── Setup global: faz login e salva a sessão ────────────────────────────
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: {
        // Setup roda sem storageState (ainda não há sessão)
        storageState: { cookies: [], origins: [] },
      },
    },

    // ─── Testes E2E em Chromium ──────────────────────────────────────────────
    {
      name: 'chromium',
      testIgnore: /global\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],

  // Pasta de artefatos (screenshots, traces, relatório HTML)
  outputDir: 'test-results/',
})
