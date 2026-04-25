import { expect, test, type Page } from '@playwright/test'
import {
  E2E_EMAIL,
  E2E_PASSWORD,
  createCompanyWithOwner,
  delayNextMutation,
  getUserIdByEmail,
  withDb,
} from './helpers/filiais-fixtures'
import {
  EMPLOYEE_EMAIL_PREFIX,
  E2E_EMPLOYEE_PREFIX,
  cleanupEmployeeE2EArtifacts,
  countAuthUsersByEmail,
  createAuthOnlyUser,
  createEmployeeRecord,
  createEmployeeWithAccess,
  getAuthUserByEmail,
  getEmployeeById,
  getEmployeeByName,
  getLatestEmployeeAudit,
  loginAsEmployee,
  resetEmployeeE2EData,
  softDeleteEmployee,
  uniqueEmployeeName,
  type EmployeeBranchSet,
} from './helpers/funcionarios-fixtures'

const employeeRow = (page: Page, name: string) => page.getByTestId('employee-row').filter({ hasText: name })

async function expectToast(page: Page, message: string | RegExp) {
  await expect(page.getByText(message, { exact: typeof message === 'string' }).last()).toBeVisible()
}

async function openNewEmployeeDialog(page: Page) {
  await page.goto('/dashboard/funcionarios')
  await page.getByRole('button', { name: 'Novo Funcionário' }).click()
  await expect(page.getByRole('heading', { name: 'Novo Funcionário' })).toBeVisible()
}

async function selectDialogOption(page: Page, triggerIndex: number, option: string) {
  const dialog = page.getByRole('dialog')
  await dialog.locator('[data-slot="select-trigger"]').nth(triggerIndex).click()
  await page.getByRole('option', { name: option }).click()
}

async function selectRole(page: Page, roleLabel: string) {
  await selectDialogOption(page, 0, roleLabel)
}

async function selectBranch(page: Page, branchName: string) {
  await selectDialogOption(page, 1, branchName)
}

async function fillEmployeeForm(
  page: Page,
  data: Partial<{
    name: string
    role: 'Administrador' | 'Atendente' | 'Técnico'
    branchName: string
    email: string
    phone: string
    cpf: string
    laborRate: string
    active: boolean
  }>,
) {
  const dialog = page.getByRole('dialog')
  if (data.name !== undefined) await dialog.getByLabel(/Nome completo/).fill(data.name)
  if (data.role !== undefined) await selectRole(page, data.role)
  if (data.branchName !== undefined) await selectBranch(page, data.branchName)
  if (data.phone !== undefined) await dialog.getByLabel('Telefone').fill(data.phone)
  if (data.cpf !== undefined) await dialog.getByLabel('CPF').fill(data.cpf)
  if (data.email !== undefined) await dialog.getByLabel('E-mail').fill(data.email)
  if (data.laborRate !== undefined) await dialog.getByLabel(/Valor de mão de obra/).fill(data.laborRate)
  if (data.active !== undefined) {
    const checkbox = dialog.getByText('Funcionário Ativo')
    const checked = await dialog.getByRole('checkbox').isChecked()
    if (checked !== data.active) await checkbox.click()
  }
}

async function createEmployeeThroughUi(page: Page, name: string, branchName: string) {
  await openNewEmployeeDialog(page)
  await fillEmployeeForm(page, { name, branchName })
  await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
  await expectToast(page, 'Funcionário cadastrado com sucesso.')
  await expect(employeeRow(page, name)).toBeVisible()
}

async function seedEmployeeSet(companyId: string, branches: EmployeeBranchSet) {
  const access = await createEmployeeWithAccess(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Acesso Ativo`,
    role: 'admin',
    email: `${EMPLOYEE_EMAIL_PREFIX}acesso@assistencianet.test`,
    branchId: branches.primary.id,
    createdAt: '2026-03-01T10:00:00Z',
  })
  const attendant = await createEmployeeRecord(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Atendente Busca`,
    role: 'atendente',
    email: `${EMPLOYEE_EMAIL_PREFIX}atendente@assistencianet.test`,
    phone: '(11) 91111-1111',
    cpf: '111.222.333-44',
    branchId: branches.primary.id,
    createdAt: '2026-03-02T10:00:00Z',
  })
  const technician = await createEmployeeRecord(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Técnico Labor`,
    role: 'tecnico',
    email: `${EMPLOYEE_EMAIL_PREFIX}tecnico@assistencianet.test`,
    phone: '(19) 92222-2222',
    cpf: '222.333.444-55',
    branchId: branches.secondary.id,
    laborRate: 49.9,
    createdAt: '2026-03-03T10:00:00Z',
  })
  const noEmail = await createEmployeeRecord(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Sem Email`,
    role: 'atendente',
    branchId: branches.secondary.id,
    createdAt: '2026-03-04T10:00:00Z',
  })
  const inactive = await createEmployeeRecord(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Inativo`,
    role: 'tecnico',
    email: `${EMPLOYEE_EMAIL_PREFIX}inativo@assistencianet.test`,
    branchId: branches.primary.id,
    active: false,
    createdAt: '2026-03-05T10:00:00Z',
  })
  const deleted = await createEmployeeRecord(companyId, {
    name: `${E2E_EMPLOYEE_PREFIX} Excluído`,
    role: 'atendente',
    email: `${EMPLOYEE_EMAIL_PREFIX}excluido@assistencianet.test`,
    branchId: branches.primary.id,
    createdAt: '2026-03-06T10:00:00Z',
  })
  await softDeleteEmployee(deleted.id, (await getUserIdByEmail(E2E_EMAIL))!)

  return { access, attendant, technician, noEmail, inactive, deleted }
}

async function expectRowNames(page: Page, names: string[]) {
  await expect.poll(async () => page.getByTestId('employee-row').locator('td:first-child div').allTextContents()).toEqual(names)
}

async function openFilter(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(`^${title}`) }).click()
}

async function toggleVisibleFilterOption(page: Page, option: string) {
  await page.getByRole('button', { name: new RegExp(`: ${option}$`) }).click()
}

test.describe('Funcionários — cobertura do caderno manual', () => {
  test.beforeAll(async () => {
    await cleanupEmployeeE2EArtifacts()
  })

  test.afterAll(async () => {
    await cleanupEmployeeE2EArtifacts()
  })

  test.describe('Acesso e autorização', () => {
    test.beforeEach(async () => {
      await resetEmployeeE2EData()
    })

    test.describe('TC-FUNC-001 — acesso sem sessão', () => {
      test.use({ storageState: { cookies: [], origins: [] } })

      test('redireciona usuário não autenticado para login', async ({ page }) => {
        await page.goto('/dashboard/funcionarios')
        await expect(page).toHaveURL(/\/login/)
      })
    })

    test('TC-FUNC-002, TC-FUNC-003 e TC-FUNC-004 — bloqueia atendente/técnico e permite owner/admin', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const atendente = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} RBAC Atendente`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}rbac-atendente@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const tecnico = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} RBAC Técnico`,
        role: 'tecnico',
        email: `${EMPLOYEE_EMAIL_PREFIX}rbac-tecnico@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const admin = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} RBAC Admin`,
        role: 'admin',
        email: `${EMPLOYEE_EMAIL_PREFIX}rbac-admin@assistencianet.test`,
        branchId: branches.primary.id,
      })

      await loginAsEmployee(page, atendente.user.email)
      await page.goto('/dashboard/funcionarios')
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('heading', { name: 'Gerenciar Funcionários' })).toBeHidden()

      await loginAsEmployee(page, tecnico.user.email)
      await page.goto('/dashboard/funcionarios')
      await expect(page).toHaveURL(/\/dashboard$/)

      await loginAsEmployee(page, admin.user.email)
      await page.goto('/dashboard/funcionarios')
      await expect(page.getByRole('heading', { name: 'Gerenciar Funcionários' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Novo Funcionário' })).toBeVisible()

      await page.context().clearCookies()
      await page.goto('/login')
      await page.getByLabel('E-mail').fill(E2E_EMAIL)
      await page.locator('input[name="password"]').fill(E2E_PASSWORD)
      await page.getByRole('button', { name: 'Entrar' }).click()
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
      await page.goto('/dashboard/funcionarios')
      await expect(page.getByRole('heading', { name: 'Gerenciar Funcionários' })).toBeVisible()
    })
  })

  test.describe('Listagem, busca, filtros e paginação', () => {
    test.beforeEach(async () => {
      await resetEmployeeE2EData()
    })

    test('TC-FUNC-005 — empresa sem funcionários mostra vazio e bloqueia busca/filtros', async ({ page }) => {
      const email = `${EMPLOYEE_EMAIL_PREFIX}empresa-vazia@assistencianet.test`
      const { user, company } = await createCompanyWithOwner(email, 'Empresa E2E Funcionários Vazia')

      await loginAsEmployee(page, user.email, 'E2eFiliais@2026!')
      await page.goto('/dashboard/funcionarios')

      await expect(page.getByText('Nenhum funcionário cadastrado')).toBeVisible()
      await expect(page.getByPlaceholder('Filtrar funcionários...')).toBeDisabled()
      await expect(page.getByRole('button', { name: /Cargo/ })).toBeDisabled()
      await withDb((client) => client.query('DELETE FROM public.companies WHERE id = $1', [company.id]))
    })

    test('TC-FUNC-006 a TC-FUNC-013 — tabela ordena, oculta excluídos, badges, colunas e ações por estado', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const seeded = await seedEmployeeSet(companyId, branches)

      await page.goto('/dashboard/funcionarios')
      await page.getByPlaceholder('Filtrar funcionários...').fill(E2E_EMPLOYEE_PREFIX)

      await expectRowNames(page, [
        seeded.access.employee.name,
        seeded.attendant.name,
        seeded.inactive.name,
        seeded.noEmail.name,
        seeded.technician.name,
      ].sort())
      await expect(employeeRow(page, seeded.deleted.name)).toBeHidden()
      await expect(employeeRow(page, seeded.inactive.name).getByText('Inativo', { exact: true })).toBeVisible()
      await expect(employeeRow(page, seeded.access.employee.name).getByText('Administrador', { exact: true })).toHaveClass(/bg-blue-100/)
      await expect(employeeRow(page, seeded.attendant.name).getByText('Atendente', { exact: true })).toHaveClass(/bg-emerald-100/)
      await expect(employeeRow(page, seeded.technician.name).getByText('Técnico', { exact: true })).toHaveClass(/bg-amber-100/)
      await expect(employeeRow(page, seeded.technician.name).getByText('R$ 49,90 / OS')).toBeVisible()
      await expect(employeeRow(page, seeded.attendant.name).getByText('—')).toBeVisible()
      await expect(employeeRow(page, seeded.access.employee.name).getByText('Ativo', { exact: true })).toBeVisible()
      await expect(employeeRow(page, seeded.attendant.name).getByText('Sem acesso')).toBeVisible()
      await expect(employeeRow(page, seeded.noEmail.name).getByText('Sem e-mail')).toBeVisible()

      await expect(page.getByRole('button', { name: `Editar funcionário ${seeded.access.employee.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Excluir funcionário ${seeded.access.employee.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Revogar acesso de ${seeded.access.employee.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Convidar funcionário ${seeded.attendant.name} por e-mail` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Definir senha provisória para ${seeded.attendant.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Convidar funcionário ${seeded.noEmail.name} por e-mail` })).toBeHidden()
      await expect(page.getByRole('button', { name: `Definir senha provisória para ${seeded.noEmail.name}` })).toBeVisible()

      await page.setViewportSize({ width: 390, height: 844 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Nome' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Cargo' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Acesso' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Filial' })).toBeHidden()

      await page.setViewportSize({ width: 1024, height: 800 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Filial' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Contato' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Mão de obra' })).toBeHidden()

      await page.setViewportSize({ width: 1280, height: 800 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Mão de obra' })).toBeVisible()
    })

    test('TC-FUNC-014 a TC-FUNC-023 — busca, filtros, limpar filtros e resultado vazio', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const seeded = await seedEmployeeSet(companyId, branches)

      await page.goto('/dashboard/funcionarios')
      const search = page.getByPlaceholder('Filtrar funcionários...')

      await search.fill('atendente busca')
      await expect(employeeRow(page, seeded.attendant.name)).toBeVisible()
      await expect(employeeRow(page, seeded.technician.name)).toBeHidden()

      await search.fill(`${EMPLOYEE_EMAIL_PREFIX}tecnico`)
      await expect(employeeRow(page, seeded.technician.name)).toBeVisible()

      await search.fill('222.333')
      await expect(employeeRow(page, seeded.technician.name)).toBeVisible()

      await search.fill('Técnico')
      await expect(employeeRow(page, seeded.technician.name)).toBeVisible()
      await expect(employeeRow(page, seeded.attendant.name)).toBeHidden()

      await search.fill(branches.primary.name)
      await expect(employeeRow(page, seeded.attendant.name)).toBeVisible()
      await expect(employeeRow(page, seeded.technician.name)).toBeHidden()

      await search.fill('')
      await openFilter(page, 'Cargo')
      await toggleVisibleFilterOption(page, 'Atendente')
      await toggleVisibleFilterOption(page, 'Técnico')
      await expect(employeeRow(page, seeded.attendant.name)).toBeVisible()
      await expect(employeeRow(page, seeded.technician.name)).toBeVisible()
      await expect(employeeRow(page, seeded.access.employee.name)).toBeHidden()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await openFilter(page, 'Filial')
      await toggleVisibleFilterOption(page, branches.secondary.name)
      await expect(employeeRow(page, seeded.technician.name)).toBeVisible()
      await expect(employeeRow(page, seeded.attendant.name)).toBeHidden()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await openFilter(page, 'Acesso')
      await toggleVisibleFilterOption(page, 'Com acesso')
      await expect(employeeRow(page, seeded.access.employee.name)).toBeVisible()
      await expect(employeeRow(page, seeded.attendant.name)).toBeHidden()
      await toggleVisibleFilterOption(page, 'Sem e-mail')
      await expect(employeeRow(page, seeded.noEmail.name)).toBeVisible()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await search.fill('não existe')
      await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Limpar filtros' }).first()).toBeVisible()

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await search.fill('Técnico Labor')
      await openFilter(page, 'Filial')
      await toggleVisibleFilterOption(page, branches.primary.name)
      await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible()
    })

    test('TC-FUNC-024 a TC-FUNC-027 — paginação, tamanho, reset ao filtrar e ajuste ao excluir', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      for (let i = 1; i <= 26; i++) {
        await createEmployeeRecord(companyId, {
          name: `${E2E_EMPLOYEE_PREFIX} Página ${String(i).padStart(2, '0')}`,
          role: i % 2 === 0 ? 'tecnico' : 'atendente',
          email: `${EMPLOYEE_EMAIL_PREFIX}pagina-${i}@assistencianet.test`,
          branchId: branches.primary.id,
        })
      }

      await page.goto('/dashboard/funcionarios')
      await page.getByPlaceholder('Filtrar funcionários...').fill(`${E2E_EMPLOYEE_PREFIX} Página`)
      await expect(page.getByText('Mostrando 10 de 26 funcionario(s)')).toBeVisible()
      await expect(page.getByText('Pagina 1 de 3')).toBeVisible()
      await page.locator('button[title="Ultima pagina"]').click()
      await expect(page.getByText('Pagina 3 de 3')).toBeVisible()

      await page.getByRole('combobox', { name: 'Linhas por pagina' }).click()
      await page.getByRole('option', { name: '25' }).click()
      await expect(page.getByText(/Pagina [12] de 2/)).toBeVisible()

      await expect(page.getByText('Pagina 2 de 2')).toBeVisible()
      await page.getByPlaceholder('Filtrar funcionários...').fill('Página 01')
      await expect(page.getByText('Pagina 1 de 1')).toBeVisible()

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await page.getByPlaceholder('Filtrar funcionários...').fill(`${E2E_EMPLOYEE_PREFIX} Página`)
      await page.getByRole('combobox', { name: 'Linhas por pagina' }).click()
      await page.getByRole('option', { name: '10' }).click()
      await page.locator('button[title="Ultima pagina"]').click()
      const visibleNames = await page.getByTestId('employee-row').locator('td:first-child div').allTextContents()
      for (const name of visibleNames) {
        await page.getByRole('button', { name: `Excluir funcionário ${name}` }).click()
        await page.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expectToast(page, `Funcionário "${name}" removido da listagem com sucesso.`)
      }
      await expect(page.getByText(/Pagina 2 de 2|Pagina 1 de 2/)).toBeVisible()
    })
  })

  test.describe('Cadastro e unicidade', () => {
    test.beforeEach(async () => {
      await resetEmployeeE2EData()
    })

    test('TC-FUNC-028 a TC-FUNC-042 — diálogo, validações, selects, máscaras e mão de obra', async ({ page }) => {
      const { branches } = await resetEmployeeE2EData()
      await openNewEmployeeDialog(page)
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: 'Novo Funcionário' })).toBeVisible()
      await expect(dialog.getByText('Atendente')).toBeVisible()
      await expect(dialog.getByText('Funcionário Ativo')).toBeVisible()

      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(dialog.getByRole('alert').filter({ hasText: 'Nome é obrigatório' })).toBeVisible()
      await expect(dialog.getByText('Filial é obrigatória')).toBeVisible()

      await dialog.getByLabel(/Nome completo/).fill('AB')
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(dialog.getByRole('alert').filter({ hasText: 'O nome deve ter no mínimo 3 caracteres' })).toBeVisible()

      await dialog.getByLabel(/Nome completo/).fill('A'.repeat(101))
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(dialog.getByRole('alert').filter({ hasText: 'O nome deve ter no máximo 100 caracteres' })).toBeVisible()

      await dialog.locator('[data-slot="select-trigger"]').nth(1).click()
      await expect(page.getByRole('option', { name: branches.primary.name })).toBeVisible()
      await expect(page.getByRole('option', { name: branches.secondary.name })).toBeVisible()
      await expect(page.getByRole('option', { name: branches.inactive.name })).toBeHidden()
      await expect(page.getByRole('option', { name: branches.deleted.name })).toBeHidden()
      await page.keyboard.press('Escape')

      await dialog.locator('[data-slot="select-trigger"]').nth(0).click()
      await expect(page.getByRole('option')).toHaveCount(3)
      await expect(page.getByRole('option', { name: 'Administrador' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Atendente' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Técnico' })).toBeVisible()
      await page.getByRole('option', { name: 'Atendente' }).click()

      await dialog.getByLabel('E-mail').fill('abc')
      await fillEmployeeForm(page, { name: 'Funcionário Validação', branchName: branches.primary.name })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(dialog.getByRole('alert').filter({ hasText: 'E-mail inválido' })).toBeVisible()

      await dialog.getByLabel('Telefone').fill('11987654321')
      await expect(dialog.getByLabel('Telefone')).toHaveValue('(11) 98765-4321')
      await dialog.getByLabel('CPF').fill('12345678901')
      await expect(dialog.getByLabel('CPF')).toHaveValue('123.456.789-01')
      await expect(dialog.getByLabel(/Valor de mão de obra/)).toBeHidden()
      await selectRole(page, 'Técnico')
      await expect(dialog.getByLabel(/Valor de mão de obra/)).toBeVisible()
      await dialog.getByLabel(/Valor de mão de obra/).fill('5010')
      await expect(dialog.getByLabel(/Valor de mão de obra/)).toHaveValue('R$ 50,10')
    })

    test('TC-FUNC-036, TC-FUNC-041, TC-FUNC-043, TC-FUNC-044, TC-FUNC-045, TC-FUNC-046 e TC-FUNC-047 — cadastro, loading, cancelamento e reabertura', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const minimalName = uniqueEmployeeName('Mínimo')
      await createEmployeeThroughUi(page, minimalName, branches.primary.name)
      await expect(employeeRow(page, minimalName).getByText('Sem e-mail')).toBeVisible()
      const minimal = await getEmployeeByName(companyId, minimalName)
      expect(minimal).toMatchObject({ name: minimalName, email: null, role: 'atendente', active: true })
      await expect(getLatestEmployeeAudit(companyId, minimal!.id, 'create')).resolves.toMatchObject({
        action: 'create',
      })

      const fullName = uniqueEmployeeName('Completo')
      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, {
        name: fullName,
        role: 'Técnico',
        branchName: branches.secondary.name,
        email: `${EMPLOYEE_EMAIL_PREFIX}completo@assistencianet.test`,
        phone: '11999998888',
        cpf: '98765432100',
        laborRate: '49.90',
      })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário cadastrado com sucesso.')
      await expect(employeeRow(page, fullName).getByText('R$ 49,90 / OS')).toBeVisible()

      const loadingName = uniqueEmployeeName('Loading')
      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, { name: loadingName, branchName: branches.primary.name })
      await delayNextMutation(page)
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(page.getByRole('button', { name: 'Carregando...' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      await expectToast(page, 'Funcionário cadastrado com sucesso.')

      const cancelledName = uniqueEmployeeName('Cancelado')
      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, { name: cancelledName, branchName: branches.primary.name })
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(employeeRow(page, cancelledName)).toBeHidden()

      await page.getByRole('button', { name: `Editar funcionário ${minimalName}` }).click()
      await expect(page.getByRole('dialog').getByLabel(/Nome completo/)).toHaveValue(minimalName)
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await page.getByRole('button', { name: `Editar funcionário ${fullName}` }).click()
      await expect(page.getByRole('dialog').getByLabel(/Nome completo/)).toHaveValue(fullName)
      await expect(page.getByRole('dialog').getByText('Técnico')).toBeVisible()
    })

    test('TC-FUNC-048 a TC-FUNC-052 — unicidade, auth existente, normalização e edição de e-mail', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const emailA = `${EMPLOYEE_EMAIL_PREFIX}duplicado-a@assistencianet.test`
      const emailB = `${EMPLOYEE_EMAIL_PREFIX}duplicado-b@assistencianet.test`
      const empA = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Email A`,
        email: emailA,
        role: 'atendente',
        branchId: branches.primary.id,
      })
      await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Email B`,
        email: emailB,
        role: 'atendente',
        branchId: branches.primary.id,
      })
      await createAuthOnlyUser(`${EMPLOYEE_EMAIL_PREFIX}auth-only@assistencianet.test`)

      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, {
        name: uniqueEmployeeName('Email Duplicado'),
        branchName: branches.primary.name,
        email: emailA,
      })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(page.getByText('Este e-mail já está cadastrado no sistema.')).toBeVisible()

      await page.getByRole('button', { name: 'Cancelar' }).click()
      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, {
        name: uniqueEmployeeName('Auth Existente'),
        branchName: branches.primary.name,
        email: `${EMPLOYEE_EMAIL_PREFIX}auth-only@assistencianet.test`,
      })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(page.getByText('Este e-mail já está cadastrado no sistema.')).toBeVisible()

      const normalizedName = uniqueEmployeeName('Email Normalizado')
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await openNewEmployeeDialog(page)
      await fillEmployeeForm(page, {
        name: normalizedName,
        branchName: branches.primary.name,
        email: `  ${EMPLOYEE_EMAIL_PREFIX}NORMALIZADO@assistencianet.test  `,
      })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário cadastrado com sucesso.')
      await expect.poll(async () => getEmployeeByName(companyId, normalizedName)).toMatchObject({
        email: `${EMPLOYEE_EMAIL_PREFIX}normalizado@assistencianet.test`,
      })

      await page.getByRole('button', { name: `Editar funcionário ${empA.name}` }).click()
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário atualizado com sucesso.')

      await page.getByRole('button', { name: `Editar funcionário ${empA.name}` }).click()
      await page.getByRole('dialog').getByLabel('E-mail').fill(emailB)
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(page.getByText('Este e-mail já está cadastrado no sistema.')).toBeVisible()
    })
  })

  test.describe('Edição, acessos, revogação e exclusão', () => {
    test.beforeEach(async () => {
      await resetEmployeeE2EData()
    })

    test('TC-FUNC-053 a TC-FUNC-057 — edição básica, app_metadata, desativar/revogar e multi-tenant', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const employee = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Editável`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}editavel@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const inactive = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Reativar`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}reativar@assistencianet.test`,
        branchId: branches.primary.id,
        active: false,
      })

      await page.goto('/dashboard/funcionarios')
      await page.getByRole('button', { name: `Editar funcionário ${employee.employee.name}` }).click()
      await fillEmployeeForm(page, { phone: '11911112222', role: 'Administrador' })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário atualizado com sucesso.')
      await expect(employeeRow(page, employee.employee.name).getByText('(11) 91111-2222')).toBeVisible()
      const authAfterRole = await getAuthUserByEmail(employee.user.email)
      expect(authAfterRole?.app_metadata.role).toBe('admin')
      await expect(getLatestEmployeeAudit(companyId, employee.employee.id, 'update')).resolves.toMatchObject({
        action: 'update',
      })

      await page.getByRole('button', { name: `Editar funcionário ${employee.employee.name}` }).click()
      await fillEmployeeForm(page, { active: false })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário atualizado com sucesso.')
      await expect.poll(() => getEmployeeById(employee.employee.id)).toMatchObject({
        active: false,
        user_id: null,
      })
      await expect.poll(() => getAuthUserByEmail(employee.user.email)).toBeNull()

      await page.getByRole('button', { name: `Editar funcionário ${inactive.name}` }).click()
      await fillEmployeeForm(page, { active: true })
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expectToast(page, 'Funcionário atualizado com sucesso.')
      await expect.poll(() => getEmployeeById(inactive.id)).toMatchObject({
        active: true,
        user_id: null,
      })

      const other = await createCompanyWithOwner(`${EMPLOYEE_EMAIL_PREFIX}tenant-owner@assistencianet.test`, 'Empresa B Funcionários')
      const otherEmployee = await createEmployeeRecord(other.company.id, {
        name: `${E2E_EMPLOYEE_PREFIX} Outro Tenant`,
        role: 'atendente',
        branchId: null,
      })
      await page.goto('/dashboard/funcionarios')
      await expect(employeeRow(page, otherEmployee.name)).toBeHidden()
    })

    test('TC-FUNC-058 a TC-FUNC-063 e TC-FUNC-084 — convite por e-mail, duplicidade e duplo clique', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const invite = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Convite`,
        role: 'tecnico',
        email: `${EMPLOYEE_EMAIL_PREFIX}convite@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const noEmail = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Convite Sem Email`,
        role: 'atendente',
        branchId: branches.primary.id,
      })
      const access = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Convite Com Acesso`,
        role: 'admin',
        email: `${EMPLOYEE_EMAIL_PREFIX}convite-acesso@assistencianet.test`,
        branchId: branches.primary.id,
      })
      await createAuthOnlyUser(`${EMPLOYEE_EMAIL_PREFIX}convite-auth-existente@assistencianet.test`)
      const duplicateAuthEmployee = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Convite Auth Existente`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}convite-auth-existente@assistencianet.test`,
        branchId: branches.primary.id,
      })

      await page.goto('/dashboard/funcionarios')
      await expect(page.getByRole('button', { name: `Convidar funcionário ${invite.name} por e-mail` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Convidar funcionário ${noEmail.name} por e-mail` })).toBeHidden()
      await expect(page.getByRole('button', { name: `Convidar funcionário ${access.employee.name} por e-mail` })).toBeHidden()

      await page.getByRole('button', { name: `Convidar funcionário ${duplicateAuthEmployee.name} por e-mail` }).click()
      await page.getByRole('button', { name: 'Enviar convite' }).click()
      await expect(page.getByText('Este e-mail já possui uma conta no sistema. Use "Definir acesso" para vincular manualmente.')).toBeVisible()
      await page.getByRole('button', { name: 'Cancelar' }).click()

      await page.getByRole('button', { name: `Convidar funcionário ${invite.name} por e-mail` }).click()
      await page.getByRole('button', { name: 'Enviar convite' }).click()
      await expectToast(page, `Convite enviado para ${invite.email}.`)
      await expect.poll(() => getEmployeeById(invite.id)).toMatchObject({
        user_id: expect.any(String),
      })
      const invitedUser = await getAuthUserByEmail(invite.email!)
      expect(invitedUser?.app_metadata).toMatchObject({ role: 'tecnico', company_id: companyId })
      await expect(getLatestEmployeeAudit(companyId, invite.id, 'send_invite')).resolves.toMatchObject({
        action: 'send_invite',
      })

      const doubleInvite = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Convite Duplo`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}convite-duplo@assistencianet.test`,
        branchId: branches.primary.id,
      })
      await page.reload()
      await page.getByRole('button', { name: `Convidar funcionário ${doubleInvite.name} por e-mail` }).click()
      const sendButton = page.getByRole('button', { name: 'Enviar convite' })
      await Promise.all([sendButton.click(), sendButton.click().catch(() => undefined)])
      await expectToast(page, `Convite enviado para ${doubleInvite.email}.`)
      await expect.poll(() => countAuthUsersByEmail(doubleInvite.email!)).toBe(1)
    })

    test('TC-FUNC-064 a TC-FUNC-071 — acesso direto, validações, senha provisória e primeira troca', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const withEmail = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Acesso Direto Email`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}direto-email@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const withoutEmail = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Acesso Direto Sem Email`,
        role: 'tecnico',
        branchId: branches.primary.id,
      })
      await createAuthOnlyUser(`${EMPLOYEE_EMAIL_PREFIX}direto-auth-existente@assistencianet.test`)
      await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Acesso Email Conflito`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}direto-conflito@assistencianet.test`,
        branchId: branches.primary.id,
      })

      await page.goto('/dashboard/funcionarios')
      await page.getByRole('button', { name: `Definir senha provisória para ${withEmail.name}` }).click()
      await expect(page.getByRole('dialog').getByLabel(/E-mail de acesso/)).toHaveValue(withEmail.email!)
      await expect(page.getByRole('dialog').getByLabel(/E-mail de acesso/)).toBeDisabled()
      await page.getByRole('button', { name: 'Cancelar' }).click()

      await page.getByRole('button', { name: `Definir senha provisória para ${withoutEmail.name}` }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByLabel(/E-mail de acesso/)).toBeEnabled()
      await dialog.getByLabel(/E-mail de acesso/).fill('abc')
      await dialog.getByLabel(/Senha provisória/).fill('12345')
      await page.getByRole('button', { name: 'Criar acesso' }).click()
      await expect(dialog.getByRole('alert').filter({ hasText: 'E-mail inválido' })).toBeVisible()
      await expect(dialog.getByRole('alert').filter({ hasText: 'A senha deve ter pelo menos 8 caracteres' })).toBeVisible()

      await dialog.getByLabel(/E-mail de acesso/).fill(`${EMPLOYEE_EMAIL_PREFIX}direto-auth-existente@assistencianet.test`)
      await dialog.getByLabel(/Senha provisória/).fill('Senha@123')
      await page.getByRole('button', { name: 'Criar acesso' }).click()
      await expect(page.getByText('Este e-mail já está cadastrado no sistema.')).toBeVisible()

      await dialog.getByLabel(/E-mail de acesso/).fill(`${EMPLOYEE_EMAIL_PREFIX}direto-conflito@assistencianet.test`)
      await page.getByRole('button', { name: 'Criar acesso' }).click()
      await expect(page.getByText('Este e-mail já está cadastrado no sistema.')).toBeVisible()

      const directEmail = `${EMPLOYEE_EMAIL_PREFIX}direto-sucesso@assistencianet.test`
      await dialog.getByLabel(/E-mail de acesso/).fill(directEmail)
      await dialog.getByLabel(/Senha provisória/).fill('Senha@123')
      await page.getByRole('button', { name: 'Criar acesso' }).click()
      await expectToast(page, `Acesso criado para ${withoutEmail.name}. Informe a senha provisória ao funcionário.`)
      await expect.poll(() => getEmployeeById(withoutEmail.id)).toMatchObject({
        email: directEmail,
        user_id: expect.any(String),
      })
      const directUser = await getAuthUserByEmail(directEmail)
      expect(directUser?.app_metadata).toMatchObject({
        role: 'tecnico',
        company_id: companyId,
        force_password_change: true,
      })
      await expect(getLatestEmployeeAudit(companyId, withoutEmail.id, 'set_password')).resolves.toMatchObject({
        action: 'set_password',
      })

      await loginAsEmployee(page, directEmail, 'Senha@123')
      await expect(page).toHaveURL(/\/dashboard\/alterar-senha/)
      await page.getByLabel(/Nova senha/).fill('Senha@456')
      await page.getByLabel(/Confirmar nova senha/).fill('Senha@456')
      await page.getByRole('button', { name: 'Salvar senha' }).click()
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('TC-FUNC-072 a TC-FUNC-075 — revogar acesso preserva cadastro e invalida sessão', async ({ browser, page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const employee = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Revogar`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}revogar@assistencianet.test`,
        branchId: branches.primary.id,
      })

      const employeeContext = await browser.newContext()
      const employeePage = await employeeContext.newPage()
      await loginAsEmployee(employeePage, employee.user.email)
      await expect(employeePage).toHaveURL(/\/dashboard/)

      await page.goto('/dashboard/funcionarios')
      await expect(page.getByRole('button', { name: `Revogar acesso de ${employee.employee.name}` })).toBeVisible()
      await page.getByRole('button', { name: `Revogar acesso de ${employee.employee.name}` }).click()
      await page.getByRole('button', { name: 'Revogar acesso' }).click()
      await expectToast(page, `Acesso de ${employee.employee.name} revogado.`)
      await expect.poll(() => getEmployeeById(employee.employee.id)).toMatchObject({
        user_id: null,
        name: employee.employee.name,
      })
      await expect.poll(() => getAuthUserByEmail(employee.user.email)).toBeNull()
      await expect(getLatestEmployeeAudit(companyId, employee.employee.id, 'revoke_access')).resolves.toMatchObject({
        action: 'revoke_access',
      })
      await employeePage.goto('/dashboard/clientes')
      await expect(employeePage).toHaveURL(/\/login/)
      await employeeContext.close()
    })

    test('TC-FUNC-076 a TC-FUNC-081 — soft delete sem/com acesso, vínculo de filial, cancelamento e persistência', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const noAccess = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Excluir Sem Acesso`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}excluir-sem-acesso@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const withAccess = await createEmployeeWithAccess(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Excluir Com Acesso`,
        role: 'tecnico',
        email: `${EMPLOYEE_EMAIL_PREFIX}excluir-com-acesso@assistencianet.test`,
        branchId: branches.secondary.id,
      })

      await page.goto('/dashboard/funcionarios')
      await page.getByRole('button', { name: `Excluir funcionário ${noAccess.name}` }).click()
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(employeeRow(page, noAccess.name)).toBeVisible()

      await page.getByRole('button', { name: `Excluir funcionário ${noAccess.name}` }).click()
      await page.getByRole('button', { name: 'Excluir da Listagem' }).click()
      await expectToast(page, `Funcionário "${noAccess.name}" removido da listagem com sucesso.`)
      await expect(employeeRow(page, noAccess.name)).toBeHidden()
      await expect.poll(() => getEmployeeById(noAccess.id)).toMatchObject({
        active: false,
        user_id: null,
        deleted_by: expect.any(String),
      })
      const noAccessAudit = await getLatestEmployeeAudit(companyId, noAccess.id, 'soft_delete')
      expect(noAccessAudit?.metadata).toMatchObject({ had_access: false })

      await page.getByRole('button', { name: `Excluir funcionário ${withAccess.employee.name}` }).click()
      await page.getByRole('button', { name: 'Excluir da Listagem' }).click()
      await expectToast(page, `Funcionário "${withAccess.employee.name}" removido da listagem com sucesso.`)
      await expect.poll(() => getAuthUserByEmail(withAccess.user.email)).toBeNull()
      const withAccessAudit = await getLatestEmployeeAudit(companyId, withAccess.employee.id, 'soft_delete')
      expect(withAccessAudit?.metadata).toMatchObject({ had_access: true, access_revoked: true })

      await page.goto('/dashboard/filiais')
      await page.getByRole('button', { name: `Excluir filial ${branches.secondary.name}` }).click()
      await page.getByRole('button', { name: 'Excluir da Listagem' }).click()
      await expect(page.getByText(`Filial "${branches.secondary.name}" removida da listagem com sucesso.`)).toBeVisible()

      await page.goto('/dashboard/funcionarios')
      await expect(employeeRow(page, noAccess.name)).toBeHidden()
      await expect(employeeRow(page, withAccess.employee.name)).toBeHidden()
    })
  })

  test.describe('Concorrência e bordas', () => {
    test.beforeEach(async () => {
      await resetEmployeeE2EData()
    })

    test('TC-FUNC-082, TC-FUNC-083 e TC-FUNC-087 — concorrência, stale delete e sessão expirada', async ({ browser, page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const employee = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Concorrente`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}concorrente@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const contextA = await browser.newContext({ storageState: '.auth/session.json' })
      const contextB = await browser.newContext({ storageState: '.auth/session.json' })
      const pageA = await contextA.newPage()
      const pageB = await contextB.newPage()

      try {
        await pageA.goto('/dashboard/funcionarios')
        await pageB.goto('/dashboard/funcionarios')
        await pageA.getByRole('button', { name: `Editar funcionário ${employee.name}` }).click()
        await pageB.getByRole('button', { name: `Editar funcionário ${employee.name}` }).click()
        await pageA.getByRole('dialog').getByLabel('Telefone').fill('11911110000')
        await pageB.getByRole('dialog').getByLabel('Telefone').fill('11922220000')
        await pageA.getByRole('button', { name: 'Salvar Funcionário' }).click()
        await expectToast(pageA, 'Funcionário atualizado com sucesso.')
        await pageB.getByRole('button', { name: 'Salvar Funcionário' }).click()
        await expectToast(pageB, 'Funcionário atualizado com sucesso.')
        await expect.poll(() => getEmployeeById(employee.id)).toMatchObject({ phone: '(11) 92222-0000' })

        const stale = await createEmployeeRecord(companyId, {
          name: `${E2E_EMPLOYEE_PREFIX} Stale Delete`,
          role: 'atendente',
          branchId: branches.primary.id,
        })
        await pageA.goto('/dashboard/funcionarios')
        await pageB.goto('/dashboard/funcionarios')
        await pageA.getByRole('button', { name: `Excluir funcionário ${stale.name}` }).click()
        await pageA.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expectToast(pageA, `Funcionário "${stale.name}" removido da listagem com sucesso.`)
        await pageB.getByRole('button', { name: `Excluir funcionário ${stale.name}` }).click()
        await pageB.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expect(pageB.getByText('Funcionário não encontrado.')).toBeVisible()
      } finally {
        await contextA.close()
        await contextB.close()
      }

      await openNewEmployeeDialog(page)
      const expiredName = uniqueEmployeeName('Sessão Expirada')
      await fillEmployeeForm(page, { name: expiredName, branchName: branches.primary.name })
      await page.context().clearCookies()
      await page.getByRole('button', { name: 'Salvar Funcionário' }).click()
      await expect(page).toHaveURL(/\/login|\/dashboard\/funcionarios/)
      await expect.poll(() => getEmployeeByName(companyId, expiredName)).toBeNull()
    })

    test('TC-FUNC-085, TC-FUNC-086 e TC-FUNC-088 — caracteres especiais, XSS e filial inativada após vínculo', async ({ page }) => {
      const { companyId, branches } = await resetEmployeeE2EData()
      const specialName = `${E2E_EMPLOYEE_PREFIX} José D'Ávila Júnior`
      await createEmployeeThroughUi(page, specialName, branches.primary.name)
      await expect(employeeRow(page, specialName)).toBeVisible()

      let dialogOpened = false
      page.on('dialog', async (dialog) => {
        dialogOpened = true
        await dialog.dismiss()
      })
      const xssName = `${E2E_EMPLOYEE_PREFIX} <img src=x onerror=alert(1)>`
      await createEmployeeThroughUi(page, xssName, branches.primary.name)
      await expect(page.getByText(xssName)).toBeVisible()
      expect(dialogOpened).toBe(false)

      const employee = await createEmployeeRecord(companyId, {
        name: `${E2E_EMPLOYEE_PREFIX} Filial Inativada`,
        role: 'atendente',
        branchId: branches.secondary.id,
      })
      await withDb((client) => client.query('UPDATE public.branches SET active = false WHERE id = $1', [branches.secondary.id]))
      await page.goto('/dashboard/funcionarios')
      await expect(employeeRow(page, employee.name)).toBeVisible()
      await page.getByRole('button', { name: `Editar funcionário ${employee.name}` }).click()
      await page.getByRole('dialog').locator('[data-slot="select-trigger"]').nth(1).click()
      await expect(page.locator('[data-slot="select-item"]').filter({ hasText: branches.secondary.name })).toBeHidden()
    })
  })
})
