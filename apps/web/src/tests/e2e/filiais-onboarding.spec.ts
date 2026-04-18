import { expect, test, type Page } from '@playwright/test'
import {
  E2E_BRANCH_PREFIX,
  EXTRA_EMAIL_PREFIX,
  cleanupExtraE2EUsers,
  countBranchesByPrefix,
  createCompanyWithOwner,
  listVisibleBranches,
  login,
} from './helpers/filiais-fixtures'

async function createOnboardingSession(page: Page, suffix: string) {
  const email = `${EXTRA_EMAIL_PREFIX}onboarding-${suffix}@assistencianet.test`
  const context = await createCompanyWithOwner(email, `Empresa Onboarding ${suffix}`, {
    onboardingCompleted: false,
    onboardingStep: 2,
  })

  await login(page, context.user.email)
  await page.goto('/onboarding/filiais')
  await expect(page.getByRole('heading', { name: 'Filiais' })).toBeVisible()

  return context
}

const branchNameInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.name"]`)
const zipInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.zip_code"]`)
const streetInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.street"]`)
const cityInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.city"]`)
const stateInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.state"]`)
const phoneInput = (page: Page, index: number) => page.locator(`input[name="branches.${index}.phone"]`)

async function mockViaCep(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (!url.includes('viacep.com.br/ws/')) {
        return originalFetch(input, init)
      }

      if (url.includes('/01310100/')) {
        return new Response(
          JSON.stringify({ logradouro: 'Avenida Paulista', localidade: 'São Paulo', uf: 'SP' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.includes('/20040002/')) {
        return new Response(
          JSON.stringify({ logradouro: 'Rua da Assembleia', localidade: 'Rio de Janeiro', uf: 'RJ' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ erro: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  })
}

test.describe('Onboarding de filiais — cobertura do caderno manual', () => {
  test.beforeAll(async () => {
    await cleanupExtraE2EUsers()
  })

  test.afterAll(async () => {
    await cleanupExtraE2EUsers()
  })

  test('TC-FIL-044, TC-FIL-045 e TC-FIL-046 — estado inicial, validação e adicionar filial', async ({ page }) => {
    await createOnboardingSession(page, 'estado-inicial')

    await expect(page.getByText('Empresa', { exact: true })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Filiais$/ })).toBeVisible()
    await expect(page.getByText('Conclusão', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Filial principal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '+ Adicionar filial' })).toBeVisible()

    await page.getByRole('button', { name: 'Próximo →' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Nome da filial obrigatório' })).toBeVisible()

    await page.getByRole('button', { name: '+ Adicionar filial' }).click()
    await expect(page.getByRole('heading', { name: 'Filial 2' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover' })).toHaveCount(1)
  })

  test('TC-FIL-047 e TC-FIL-048 — limite de 10 filiais, remoção e renumeração', async ({ page }) => {
    await createOnboardingSession(page, 'limite-remocao')

    for (let i = 0; i < 9; i++) {
      await page.getByRole('button', { name: '+ Adicionar filial' }).click()
    }

    await expect(page.getByRole('heading', { name: 'Filial 10' })).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Adicionar filial' })).toBeHidden()
    await page.getByRole('button', { name: 'Remover' }).first().click()
    await expect(page.getByRole('heading', { name: 'Filial 10' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Filial 9' })).toBeVisible()
  })

  test('TC-FIL-049 e TC-FIL-050 — UF vira maiúscula e ViaCEP preenche cada bloco separadamente', async ({ page }) => {
    await mockViaCep(page)
    await createOnboardingSession(page, 'viacep')
    await stateInput(page, 0).fill('sp')
    await expect(stateInput(page, 0)).toHaveValue('SP')

    await page.getByRole('button', { name: '+ Adicionar filial' }).click()
    await zipInput(page, 0).fill('01310100')
    await zipInput(page, 1).fill('20040002')

    await expect(streetInput(page, 0)).toHaveValue('Avenida Paulista')
    await expect(cityInput(page, 0)).toHaveValue('São Paulo')
    await expect(stateInput(page, 0)).toHaveValue('SP')
    await expect(streetInput(page, 1)).toHaveValue('Rua da Assembleia')
    await expect(cityInput(page, 1)).toHaveValue('Rio de Janeiro')
    await expect(stateInput(page, 1)).toHaveValue('RJ')
  })

  test('TC-FIL-051 — voltar leva para o passo de empresa', async ({ page }) => {
    await createOnboardingSession(page, 'voltar')

    await branchNameInput(page, 0).fill(`${E2E_BRANCH_PREFIX} Rascunho Onboarding`)
    await page.getByRole('link', { name: '← Voltar' }).click()
    await expect(page).toHaveURL(/\/onboarding\/empresa/)
  })

  test('TC-FIL-052 — avançar cria filiais e redireciona para conclusão', async ({ page }) => {
    const { company } = await createOnboardingSession(page, 'avancar')
    const firstName = `${E2E_BRANCH_PREFIX} Onboarding Principal`
    const secondName = `${E2E_BRANCH_PREFIX} Onboarding Centro`

    await branchNameInput(page, 0).fill(firstName)
    await zipInput(page, 0).fill('01310-100')
    await streetInput(page, 0).fill('Avenida Paulista')
    await cityInput(page, 0).fill('São Paulo')
    await stateInput(page, 0).fill('SP')
    await phoneInput(page, 0).fill('11999998888')
    await page.getByRole('button', { name: '+ Adicionar filial' }).click()
    await branchNameInput(page, 1).fill(secondName)
    await cityInput(page, 1).fill('Campinas')
    await stateInput(page, 1).fill('SP')

    await page.getByRole('button', { name: 'Próximo →' }).click()
    await expect(page).toHaveURL(/\/onboarding\/conclusao/)
    await expect(page.getByRole('heading', { name: 'Tudo pronto!' })).toBeVisible()

    const branches = await listVisibleBranches(company.id)
    expect(branches.map((branch) => branch.name).sort()).toEqual([firstName, secondName].sort())
    expect(branches.find((branch) => branch.name === firstName)?.is_main).toBe(true)
    expect(branches.find((branch) => branch.name === secondName)?.is_main).toBe(false)
  })

  test('TC-FIL-053 — duplo clique em Próximo não mantém filiais duplicadas ativas', async ({ page }) => {
    const { company } = await createOnboardingSession(page, 'duplo-clique')
    const name = `${E2E_BRANCH_PREFIX} Onboarding Duplo Clique`

    await branchNameInput(page, 0).fill(name)
    const submit = page.getByRole('button', { name: 'Próximo →' })
    await Promise.all([submit.click(), submit.click().catch(() => undefined)])
    await expect(page).toHaveURL(/\/onboarding\/conclusao/)
    await expect.poll(() => countBranchesByPrefix(company.id, name)).toBe(1)
  })
})
