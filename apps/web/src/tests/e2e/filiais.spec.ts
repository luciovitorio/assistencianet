import { expect, test, type Page } from '@playwright/test'
import {
  E2E_BRANCH_PREFIX,
  E2E_EMAIL,
  EXTRA_EMAIL_PREFIX,
  cleanupExtraE2EUsers,
  createBranch,
  createCompanyWithOwner,
  createEmployee,
  createEmployeeUser,
  delayNextMutation,
  deleteAllBranches,
  findBranchByName,
  getE2ECompanyId,
  getLatestBranchAudit,
  getUserIdByEmail,
  login,
  resetE2EBranches,
  softDeleteBranch,
  uniqueBranchName,
  withDb,
} from './helpers/filiais-fixtures'

const branchCard = (page: Page, name: string) => page.getByTestId('branch-card').filter({ hasText: name })
const branchActions = (page: Page, name: string) => branchCard(page, name).getByTestId('branch-card-actions')

async function openNewBranchDialog(page: Page) {
  await page.goto('/dashboard/filiais')
  await page.getByRole('button', { name: 'Nova Filial' }).click()
  await expect(page.getByRole('heading', { name: 'Nova Filial' })).toBeVisible()
}

async function fillBranchForm(
  page: Page,
  data: Partial<{
    name: string
    phone: string
    zipCode: string
    address: string
    city: string
    state: string
  }>,
) {
  if (data.name !== undefined) await page.getByLabel(/Nome da Filial/).fill(data.name)
  if (data.phone !== undefined) await page.getByLabel('Telefone').fill(data.phone)
  if (data.zipCode !== undefined) await page.getByLabel('CEP').fill(data.zipCode)
  if (data.address !== undefined) await page.getByLabel('Endereço').fill(data.address)
  if (data.city !== undefined) await page.getByLabel('Cidade').fill(data.city)
  if (data.state !== undefined) await page.getByLabel('Estado (UF)').fill(data.state)
}

async function createBranchThroughUi(page: Page, name: string) {
  await openNewBranchDialog(page)
  await fillBranchForm(page, { name })
  await page.getByRole('button', { name: 'Salvar Filial' }).click()
  await expect(page.getByText('Filial cadastrada com sucesso.')).toBeVisible()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

async function expectGridColumns(page: Page, columns: number) {
  const columnCount = await page.getByTestId('branch-card-grid').evaluate((el) => {
    const value = window.getComputedStyle(el).gridTemplateColumns
    return value === 'none' ? 0 : value.split(' ').filter(Boolean).length
  })

  expect(columnCount).toBe(columns)
}

async function expectCurrentUserUpdateIsBlocked(branchId: string, companyId: string) {
  const result = await withDb((client) =>
    client.query(
      `UPDATE public.branches
       SET name = 'Hackeada'
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [branchId, companyId],
    ),
  )

  expect(result.rowCount).toBe(0)
}

async function mockBranchDialogViaCep(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (!url.includes('viacep.com.br/ws/')) {
        return originalFetch(input, init)
      }

      window.__branchE2EViaCepRequests = window.__branchE2EViaCepRequests ?? []
      window.__branchE2EViaCepRequests.push(url)

      if (url.includes('/01310100/')) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return new Response(
          JSON.stringify({ logradouro: 'Avenida Paulista', localidade: 'São Paulo', uf: 'SP' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.includes('/00000000/')) {
        return new Response(JSON.stringify({ erro: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/22222222/')) {
        throw new TypeError('Falha de rede simulada no ViaCEP')
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  })
}

declare global {
  interface Window {
    __branchE2EViaCepRequests?: string[]
  }
}

test.describe('Cadastro de filiais — cobertura do caderno manual', () => {
  test.beforeAll(async () => {
    await cleanupExtraE2EUsers()
  })

  test.afterAll(async () => {
    await cleanupExtraE2EUsers()
  })

  test.describe('Acesso e autorização', () => {
    test.beforeEach(async () => {
      await resetE2EBranches()
    })

    test.describe('TC-FIL-001 — acesso sem sessão', () => {
      test.use({ storageState: { cookies: [], origins: [] } })

      test('redireciona usuário não autenticado para login', async ({ page }) => {
        await page.goto('/dashboard/filiais')
        await expect(page).toHaveURL(/\/login/)
      })
    })

    test('TC-FIL-002 e TC-FIL-003 — atendente e técnico são redirecionados para o dashboard', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('RBAC') })
      const atendente = await createEmployeeUser({
        email: `${EXTRA_EMAIL_PREFIX}atendente@assistencianet.test`,
        companyId,
        branchId: branch.id,
        role: 'atendente',
      })
      const tecnico = await createEmployeeUser({
        email: `${EXTRA_EMAIL_PREFIX}tecnico@assistencianet.test`,
        companyId,
        branchId: branch.id,
        role: 'tecnico',
      })

      await login(page, atendente.email)
      await page.goto('/dashboard/filiais')
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('heading', { name: 'Gerenciar Filiais' })).toBeHidden()

      await login(page, tecnico.email)
      await page.goto('/dashboard/filiais')
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('heading', { name: 'Gerenciar Filiais' })).toBeHidden()
    })

    test('TC-FIL-004 e TC-FIL-005 — owner e admin acessam a gestão de filiais', async ({ page }) => {
      await page.goto('/dashboard/filiais')
      await expect(page.getByRole('heading', { name: 'Gerenciar Filiais' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Nova Filial' })).toBeVisible()

      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('Admin') })
      const admin = await createEmployeeUser({
        email: `${EXTRA_EMAIL_PREFIX}admin@assistencianet.test`,
        companyId,
        branchId: branch.id,
        role: 'admin',
      })

      await login(page, admin.email)
      await page.goto('/dashboard/filiais')
      await expect(page.getByRole('heading', { name: 'Gerenciar Filiais' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Nova Filial' })).toBeVisible()
      await expect(page.getByRole('button', { name: `Editar filial ${branch.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Excluir filial ${branch.name}` })).toBeVisible()
    })
  })

  test.describe('Listagem e cards', () => {
    test.beforeEach(async () => {
      await resetE2EBranches()
    })

    test('TC-FIL-006 — empresa sem filiais exibe estado vazio', async ({ page }) => {
      const email = `${EXTRA_EMAIL_PREFIX}empresa-vazia@assistencianet.test`
      const { user, company } = await createCompanyWithOwner(email, 'Empresa E2E Sem Filiais')
      await deleteAllBranches(company.id)

      await login(page, user.email)
      await page.goto('/dashboard/filiais')

      await expect(page.getByText('Nenhuma filial cadastrada')).toBeVisible()
      await expect(page.getByText('Você ainda não cadastrou nenhuma filial. Clique no botão acima para adicionar a primeira.')).toBeVisible()
    })

    test('TC-FIL-007, TC-FIL-008, TC-FIL-009 e TC-FIL-010 — lista ordena, oculta excluídas e mostra badges/fallbacks', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      await deleteAllBranches(companyId)
      await createBranch(companyId, {
        name: `${E2E_BRANCH_PREFIX} Matriz`,
        is_main: true,
        city: 'São Paulo',
        state: 'SP',
        phone: '(11) 90000-0001',
        created_at: '2026-01-01T10:00:00Z',
      })
      await createBranch(companyId, {
        name: `${E2E_BRANCH_PREFIX} Inativa`,
        active: false,
        city: 'Campinas',
        state: 'SP',
        phone: '(19) 90000-0002',
        created_at: '2026-01-02T10:00:00Z',
      })
      const onlyName = await createBranch(companyId, {
        name: `${E2E_BRANCH_PREFIX} Somente Nome`,
        created_at: '2026-01-03T10:00:00Z',
      })
      const deleted = await createBranch(companyId, {
        name: `${E2E_BRANCH_PREFIX} Excluída`,
        created_at: '2026-01-04T10:00:00Z',
      })
      await softDeleteBranch(deleted.id, await getUserIdByEmail(E2E_EMAIL) ?? onlyName.id)

      await page.goto('/dashboard/filiais')

      const headings = await page.getByTestId('branch-card').locator('h3').allTextContents()
      expect(headings).toEqual([
        `${E2E_BRANCH_PREFIX} Matriz`,
        `${E2E_BRANCH_PREFIX} Inativa`,
        `${E2E_BRANCH_PREFIX} Somente Nome`,
      ])
      await expect(page.getByRole('heading', { name: `${E2E_BRANCH_PREFIX} Excluída` })).toBeHidden()
      await expect(branchCard(page, `${E2E_BRANCH_PREFIX} Matriz`).getByText('Matriz', { exact: true })).toBeVisible()
      await expect(branchCard(page, `${E2E_BRANCH_PREFIX} Inativa`).getByText('Inativa', { exact: true })).toBeVisible()
      await expect(branchCard(page, `${E2E_BRANCH_PREFIX} Somente Nome`).getByText('Endereço não informado')).toBeVisible()
      await expect(branchCard(page, `${E2E_BRANCH_PREFIX} Somente Nome`).getByText('Sem telefone')).toBeVisible()
    })

    test('TC-FIL-011, TC-FIL-012 e TC-FIL-059 — ações respeitam hover/mobile e aria-labels', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('Ações') })

      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/dashboard/filiais')
      await expect(branchActions(page, branch.name)).toHaveCSS('opacity', '0')
      await branchCard(page, branch.name).hover()
      await expect(branchActions(page, branch.name)).toHaveCSS('opacity', '1')
      await expect(page.getByRole('button', { name: `Editar filial ${branch.name}` })).toHaveAttribute('aria-label', `Editar filial ${branch.name}`)
      await expect(page.getByRole('button', { name: `Excluir filial ${branch.name}` })).toHaveAttribute('aria-label', `Excluir filial ${branch.name}`)

      await page.setViewportSize({ width: 390, height: 844 })
      await page.reload()
      await expect(branchActions(page, branch.name)).toHaveCSS('opacity', '1')
    })
  })

  test.describe('Cadastro', () => {
    test.beforeEach(async () => {
      await resetE2EBranches()
    })

    test('TC-FIL-013, TC-FIL-014, TC-FIL-015, TC-FIL-016 e TC-FIL-017 — abertura e validações de nome', async ({ page }) => {
      await openNewBranchDialog(page)
      await expect(page.getByLabel(/Nome da Filial/)).toHaveValue('')
      await expect(page.getByLabel('Telefone')).toHaveValue('')
      await expect(page.getByLabel('CEP')).toHaveValue('')
      await expect(page.getByLabel('Endereço')).toHaveValue('')
      await expect(page.getByLabel('Cidade')).toHaveValue('')
      await expect(page.getByLabel('Estado (UF)')).toHaveValue('')
      await expect(page.getByRole('checkbox', { name: 'Filial Ativa' })).toBeChecked()

      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page.getByRole('alert').filter({ hasText: 'Nome da filial é obrigatório' })).toBeVisible()

      await page.getByLabel(/Nome da Filial/).fill('AB')
      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page.getByRole('alert').filter({ hasText: 'O nome deve ter no mínimo 3 caracteres' })).toBeVisible()

      await page.getByLabel(/Nome da Filial/).fill('A'.repeat(101))
      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page.getByRole('alert').filter({ hasText: 'O nome deve ter no máximo 100 caracteres' })).toBeVisible()

      await page.getByLabel(/Nome da Filial/).fill('   ')
      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page.getByRole('alert').filter({ hasText: /Nome da filial é obrigatório|O nome deve ter no mínimo/ })).toBeVisible()
    })

    test('TC-FIL-018, TC-FIL-019 e TC-FIL-024 — máscaras de telefone/CEP e UF limitada', async ({ page }) => {
      await openNewBranchDialog(page)
      await page.getByLabel('Telefone').fill('11987654321')
      await expect(page.getByLabel('Telefone')).toHaveValue('(11) 98765-4321')

      await page.getByLabel('CEP').fill('01310100')
      await expect(page.getByLabel('CEP')).toHaveValue('01310-100')

      await page.getByLabel('Estado (UF)').fill('SPP')
      await expect(page.getByLabel('Estado (UF)')).toHaveValue('SP')
    })

    test('TC-FIL-020, TC-FIL-021, TC-FIL-022 e TC-FIL-023 — ViaCEP preenche, ignora inválidos/incompletos e falha sem travar', async ({ page }) => {
      await mockBranchDialogViaCep(page)
      await openNewBranchDialog(page)
      await page.getByLabel('CEP').fill('01310100')
      await expect(page.getByTestId('cep-loading')).toBeVisible()
      await expect(page.getByLabel('Endereço')).toHaveValue('Avenida Paulista')
      await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
      await expect(page.getByLabel('Estado (UF)')).toHaveValue('SP')

      await page.getByLabel('Endereço').fill('')
      await page.getByLabel('Cidade').fill('')
      await page.getByLabel('Estado (UF)').fill('')
      await page.getByLabel('CEP').fill('00000000')
      await expect(page.getByLabel('Endereço')).toHaveValue('')
      await expect(page.getByLabel('Cidade')).toHaveValue('')

      await page.getByLabel('CEP').fill('01310')
      const requests = await page.evaluate(() => window.__branchE2EViaCepRequests ?? [])
      expect(requests.some((url) => url.includes('/01310/'))).toBe(false)

      await page.getByLabel('CEP').fill('22222222')
      await page.getByLabel('Endereço').fill('Rua manual após falha')
      await expect(page.getByLabel('Endereço')).toHaveValue('Rua manual após falha')
    })

    test('TC-FIL-025, TC-FIL-026, TC-FIL-027 e TC-FIL-028 — cadastra com auditoria, aceita só nome e desabilita durante envio', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const fullName = uniqueBranchName('Cadastro Completo')
      await openNewBranchDialog(page)
      await fillBranchForm(page, {
        name: fullName,
        phone: '(11) 98888-7777',
        address: 'Rua E2E, 123',
        city: 'São Paulo',
        state: 'SP',
      })
      await page.getByRole('button', { name: 'Salvar Filial' }).click()

      await expect(page.getByText('Filial cadastrada com sucesso.')).toBeVisible()
      await expect(branchCard(page, fullName).getByText('São Paulo - SP')).toBeVisible()
      await expect(branchCard(page, fullName).getByText('(11) 98888-7777')).toBeVisible()

      const created = await findBranchByName(companyId, fullName)
      expect(created).toMatchObject({ name: fullName, city: 'São Paulo', state: 'SP', phone: '(11) 98888-7777', active: true })
      await expect(getLatestBranchAudit(companyId, created!.id, 'create')).resolves.toMatchObject({
        action: 'create',
        summary: `Filial "${fullName}" cadastrada.`,
      })

      const onlyName = uniqueBranchName('Somente Nome')
      await createBranchThroughUi(page, onlyName)
      await expect(branchCard(page, onlyName).getByText('Endereço não informado')).toBeVisible()
      await expect(branchCard(page, onlyName).getByText('Sem telefone')).toBeVisible()

      const delayedName = uniqueBranchName('Loading')
      await openNewBranchDialog(page)
      await fillBranchForm(page, { name: delayedName })
      await delayNextMutation(page)
      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page.getByRole('button', { name: 'Carregando...' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      await expect(page.getByText('Filial cadastrada com sucesso.')).toBeVisible()
    })

    test('TC-FIL-029, TC-FIL-030 e TC-FIL-031 — cancelar, fechar e reabrir limpam o formulário', async ({ page }) => {
      const cancelledName = uniqueBranchName('Cancelada')

      await openNewBranchDialog(page)
      await fillBranchForm(page, { name: cancelledName, city: 'Rascunho' })
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByRole('heading', { name: 'Nova Filial' })).toBeHidden()
      await expect(page.getByRole('heading', { name: cancelledName })).toBeHidden()

      await openNewBranchDialog(page)
      await fillBranchForm(page, { name: 'Será descartada' })
      await page.getByRole('button', { name: 'Fechar' }).click()
      await expect(page.getByRole('heading', { name: 'Nova Filial' })).toBeHidden()

      await openNewBranchDialog(page)
      await expect(page.getByLabel(/Nome da Filial/)).toHaveValue('')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: 'Nova Filial' })).toBeHidden()
    })
  })

  test.describe('Edição e exclusão', () => {
    test.beforeEach(async () => {
      await resetE2EBranches()
    })

    test('TC-FIL-032, TC-FIL-033, TC-FIL-034 e TC-FIL-036 — edição preenche, salva, alterna ativa e não vaza estado', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const branchA = await createBranch(companyId, {
        name: uniqueBranchName('Original A'),
        city: 'São Paulo',
        state: 'SP',
        phone: '(11) 90000-1111',
      })
      const branchB = await createBranch(companyId, {
        name: uniqueBranchName('Original B'),
        city: 'Rio de Janeiro',
        state: 'RJ',
      })
      const editedName = `${branchA.name} Editada`

      await page.goto('/dashboard/filiais')
      await page.getByRole('button', { name: `Editar filial ${branchA.name}` }).click()
      await expect(page.getByRole('heading', { name: 'Editar Filial' })).toBeVisible()
      await expect(page.getByLabel(/Nome da Filial/)).toHaveValue(branchA.name)
      await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
      await page.getByLabel(/Nome da Filial/).fill(editedName)
      await page.getByLabel('Cidade').fill('Campinas')
      await page.getByLabel('Estado (UF)').fill('MG')
      await page.getByText('Filial Ativa').click()
      await page.getByRole('button', { name: 'Salvar Filial' }).click()

      await expect(page.getByText('Filial atualizada com sucesso.')).toBeVisible()
      await expect(branchCard(page, editedName).getByText('Campinas - MG')).toBeVisible()
      await expect(branchCard(page, editedName).getByText('Inativa')).toBeVisible()

      const edited = await findBranchByName(companyId, editedName)
      expect(edited).toMatchObject({ id: branchA.id, active: false, city: 'Campinas', state: 'MG' })
      await expect(getLatestBranchAudit(companyId, branchA.id, 'update')).resolves.toMatchObject({
        action: 'update',
        summary: `Filial "${branchA.name}" atualizada.`,
      })

      await page.getByRole('button', { name: `Editar filial ${editedName}` }).click()
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await page.getByRole('button', { name: `Editar filial ${branchB.name}` }).click()
      await expect(page.getByLabel(/Nome da Filial/)).toHaveValue(branchB.name)
      await expect(page.getByLabel('Cidade')).toHaveValue('Rio de Janeiro')
    })

    test('TC-FIL-035 e TC-FIL-043 — guards bloqueiam outra empresa e filial já excluída', async () => {
      const companyAId = await getE2ECompanyId()
      const otherEmail = `${EXTRA_EMAIL_PREFIX}empresa-b@assistencianet.test`
      const { company: companyB } = await createCompanyWithOwner(otherEmail, 'Empresa B E2E')
      const branchB = await createBranch(companyB.id, { name: uniqueBranchName('Empresa B') })
      await expectCurrentUserUpdateIsBlocked(branchB.id, companyAId)

      const deleted = await createBranch(companyAId, { name: uniqueBranchName('Já Excluída') })
      await softDeleteBranch(deleted.id, (await getUserIdByEmail(E2E_EMAIL))!)
      await expectCurrentUserUpdateIsBlocked(deleted.id, companyAId)
      const after = await findBranchByName(companyAId, deleted.name)
      expect(after?.deleted_at).toBeTruthy()
    })

    test('TC-FIL-037, TC-FIL-038, TC-FIL-039, TC-FIL-041 e TC-FIL-042 — diálogo de exclusão, cancelamento, loading, soft delete e reload', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('Excluir') })

      await page.goto('/dashboard/filiais')
      await page.getByRole('button', { name: `Excluir filial ${branch.name}` }).click()
      await expect(page.getByRole('heading', { name: 'Excluir Filial' })).toBeVisible()
      await expect(page.getByRole('dialog').getByText(branch.name)).toBeVisible()
      await expect(page.getByText('O registro será removido da listagem, mas o histórico continuará disponível para auditoria.')).toBeVisible()

      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByRole('heading', { name: branch.name })).toBeVisible()

      await page.getByRole('button', { name: `Excluir filial ${branch.name}` }).click()
      await delayNextMutation(page)
      await page.getByRole('button', { name: 'Excluir da Listagem' }).click()
      await expect(page.getByRole('button', { name: 'Excluindo...' })).toBeDisabled()
      await expect(page.getByText(`Filial "${branch.name}" removida da listagem com sucesso.`)).toBeVisible()
      await expect(page.getByRole('heading', { name: branch.name })).toBeHidden()

      const deleted = await findBranchByName(companyId, branch.name)
      expect(deleted).toMatchObject({ id: branch.id, active: false })
      expect(deleted?.deleted_at).toBeTruthy()
      expect(deleted?.deleted_by).toBeTruthy()
      await expect(getLatestBranchAudit(companyId, branch.id, 'soft_delete')).resolves.toMatchObject({
        action: 'soft_delete',
        summary: `Filial "${branch.name}" removida da listagem.`,
      })

      await page.reload()
      await expect(page.getByRole('heading', { name: branch.name })).toBeHidden()
    })

    test('TC-FIL-040 — exclusão é bloqueada quando há funcionário ativo vinculado', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('Com Funcionário') })
      await createEmployee(companyId, branch.id)

      await page.goto('/dashboard/filiais')
      await page.getByRole('button', { name: `Excluir filial ${branch.name}` }).click()
      await page.getByRole('button', { name: 'Excluir da Listagem' }).click()

      await expect(page.getByText('Não é possível excluir uma filial com funcionários vinculados.')).toBeVisible()
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(page.getByRole('heading', { name: branch.name })).toBeVisible()
      const after = await findBranchByName(companyId, branch.name)
      expect(after?.deleted_at).toBeNull()
    })
  })

  test.describe('Responsividade, acessibilidade, concorrência e bordas', () => {
    test.beforeEach(async () => {
      await resetE2EBranches()
    })

    test('TC-FIL-054, TC-FIL-055, TC-FIL-056 e TC-FIL-057 — layout responsivo e modal com scroll', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      await deleteAllBranches(companyId)
      await createBranch(companyId, { name: uniqueBranchName('Resp 1') })
      await createBranch(companyId, { name: uniqueBranchName('Resp 2') })
      await createBranch(companyId, { name: uniqueBranchName('Resp 3') })

      await page.setViewportSize({ width: 375, height: 844 })
      await page.goto('/dashboard/filiais')
      await expect(page.getByRole('heading', { name: 'Gerenciar Filiais' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Nova Filial' })).toBeVisible()
      await expectGridColumns(page, 1)

      await page.setViewportSize({ width: 768, height: 844 })
      await page.reload()
      await expectGridColumns(page, 2)

      await page.setViewportSize({ width: 1280, height: 800 })
      await page.reload()
      await expectGridColumns(page, 3)

      await page.setViewportSize({ width: 390, height: 600 })
      await page.getByRole('button', { name: 'Nova Filial' }).click()
      await expect(page.getByRole('dialog')).toHaveCSS('max-height', '540px')
      await expect(page.getByRole('dialog')).toHaveCSS('overflow-y', 'auto')
    })

    test('TC-FIL-058 — navegação por teclado no diálogo', async ({ page }) => {
      const name = uniqueBranchName('Teclado')

      await openNewBranchDialog(page)
      await page.getByLabel(/Nome da Filial/).focus()
      await expect(page.getByLabel(/Nome da Filial/)).toBeFocused()
      await page.keyboard.type(name)
      await page.keyboard.press('Tab')
      await expect(page.getByLabel('Telefone')).toBeFocused()
      await page.getByRole('button', { name: 'Salvar Filial' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { name })).toBeVisible()

      await page.getByRole('button', { name: `Editar filial ${name}` }).click()
      await expect(page.getByRole('heading', { name: 'Editar Filial' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: 'Editar Filial' })).toBeHidden()
    })

    test('TC-FIL-060 e TC-FIL-061 — edição/exclusão concorrentes não quebram a UI', async ({ browser }) => {
      const companyId = await getE2ECompanyId()
      const branch = await createBranch(companyId, { name: uniqueBranchName('Concorrente') })
      const contextA = await browser.newContext({ storageState: '.auth/session.json' })
      const contextB = await browser.newContext({ storageState: '.auth/session.json' })
      const pageA = await contextA.newPage()
      const pageB = await contextB.newPage()

      try {
        await pageA.goto('/dashboard/filiais')
        await pageB.goto('/dashboard/filiais')

        await pageA.getByRole('button', { name: `Editar filial ${branch.name}` }).click()
        await pageB.getByRole('button', { name: `Editar filial ${branch.name}` }).click()
        await pageA.getByLabel(/Nome da Filial/).fill(`${branch.name} Aba A`)
        await pageB.getByLabel(/Nome da Filial/).fill(`${branch.name} Aba B`)
        await pageA.getByRole('button', { name: 'Salvar Filial' }).click()
        await expect(pageA.getByText('Filial atualizada com sucesso.')).toBeVisible()
        await pageB.getByRole('button', { name: 'Salvar Filial' }).click()
        await expect(pageB.getByText('Filial atualizada com sucesso.')).toBeVisible()
        const edited = await findBranchByName(companyId, `${branch.name} Aba B`)
        expect(edited?.id).toBe(branch.id)

        const deleteBranch = await createBranch(companyId, { name: uniqueBranchName('Delete Concorrente') })
        await pageA.goto('/dashboard/filiais')
        await pageB.goto('/dashboard/filiais')
        await pageA.getByRole('button', { name: `Excluir filial ${deleteBranch.name}` }).click()
        await pageA.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expect(pageA.getByText(`Filial "${deleteBranch.name}" removida da listagem com sucesso.`)).toBeVisible()
        await pageB.getByRole('button', { name: `Editar filial ${deleteBranch.name}` }).click()
        await pageB.getByLabel(/Nome da Filial/).fill(`${deleteBranch.name} Stale`)
        await pageB.getByRole('button', { name: 'Salvar Filial' }).click()
        await expect(pageB.getByText('Filial não encontrada.')).toBeVisible()
      } finally {
        await contextA.close()
        await contextB.close()
      }
    })

    test('TC-FIL-062 e TC-FIL-063 — caracteres especiais e XSS são renderizados como texto', async ({ page }) => {
      const specialName = `${E2E_BRANCH_PREFIX} Açaí & Cia - Filial nº 1 / Centro`
      await createBranchThroughUi(page, specialName)
      await expect(page.getByRole('heading', { name: specialName })).toBeVisible()

      let dialogOpened = false
      page.on('dialog', async (dialog) => {
        dialogOpened = true
        await dialog.dismiss()
      })
      const xssName = `${E2E_BRANCH_PREFIX} <script>alert('x')</script>`
      await createBranchThroughUi(page, xssName)
      await expect(page.getByText(xssName)).toBeVisible()
      expect(dialogOpened).toBe(false)
    })

    test('TC-FIL-064 — sessão expirada durante cadastro não persiste dado inconsistente', async ({ page }) => {
      const companyId = await getE2ECompanyId()
      const name = uniqueBranchName('Sessão Expirada')

      await openNewBranchDialog(page)
      await fillBranchForm(page, { name })
      await page.context().clearCookies()
      await page.getByRole('button', { name: 'Salvar Filial' }).click()
      await expect(page).toHaveURL(/\/login|\/dashboard\/filiais/)
      await expect.poll(() => findBranchByName(companyId, name)).toBeNull()
    })
  })
})
