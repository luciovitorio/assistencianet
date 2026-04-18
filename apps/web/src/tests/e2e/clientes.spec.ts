import { expect, test, type Page } from '@playwright/test'
import {
  E2E_EMAIL,
  E2E_PASSWORD,
  createCompanyWithOwner,
  delayNextMutation,
  getUserIdByEmail,
  withDb,
} from './helpers/filiais-fixtures'
import { EMPLOYEE_EMAIL_PREFIX, loginAsEmployee } from './helpers/funcionarios-fixtures'
import {
  E2E_CLIENT_PREFIX,
  CLIENT_NOTES_PREFIX,
  cleanupClientE2EArtifacts,
  createClientRecord,
  getClientById,
  getClientByName,
  getLatestClientAudit,
  openClientsPage,
  resetClientE2EData,
  softDeleteClient,
  uniqueClientName,
  uniqueDocument,
  type ClientBranchSet,
} from './helpers/clientes-fixtures'
import { createEmployeeWithAccess } from './helpers/funcionarios-fixtures'

const clientRow = (page: Page, name: string) =>
  page.getByTestId('client-row').filter({ hasText: name })

async function expectToast(page: Page, message: string | RegExp) {
  await expect(page.getByText(message, { exact: typeof message === 'string' }).last()).toBeVisible()
}

async function openNewClientDialog(page: Page) {
  await openClientsPage(page)
  await page.getByRole('button', { name: 'Novo Cliente' }).click()
  await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible()
}

async function fillClientForm(
  page: Page,
  data: Partial<{
    name: string
    document: string
    phone: string
    email: string
    zipCode: string
    street: string
    number: string
    complement: string
    city: string
    state: string
    branchName: string
    notes: string
    active: boolean
  }>,
) {
  const dialog = page.getByRole('dialog')
  if (data.name !== undefined) await dialog.getByLabel(/Nome completo/).fill(data.name)
  if (data.document !== undefined) await dialog.getByLabel('CPF/CNPJ *').fill(data.document)
  if (data.phone !== undefined) await dialog.getByLabel('Telefone / WhatsApp *').fill(data.phone)
  if (data.email !== undefined) await dialog.getByLabel('E-mail', { exact: true }).fill(data.email)
  if (data.zipCode !== undefined) await dialog.getByLabel('CEP').fill(data.zipCode)
  if (data.street !== undefined) await dialog.getByLabel('Rua').fill(data.street)
  if (data.number !== undefined) await dialog.getByLabel('Número').fill(data.number)
  if (data.complement !== undefined) await dialog.getByLabel('Complemento').fill(data.complement)
  if (data.city !== undefined) await dialog.getByLabel('Cidade').fill(data.city)
  if (data.notes !== undefined) await dialog.getByPlaceholder('Informações úteis para a equipe.').fill(data.notes)
  if (data.state !== undefined) {
    await dialog.locator('[data-slot="select-trigger"]').first().click()
    await page.getByRole('option', { name: new RegExp(`\\(${data.state}\\)$`) }).click()
  }
  if (data.branchName !== undefined) {
    await dialog.locator('[data-slot="select-trigger"]').nth(1).click()
    await page.getByRole('option', { name: data.branchName }).click()
  }
  if (data.active !== undefined) {
    const checkbox = dialog.getByRole('checkbox').first()
    const checked = await checkbox.isChecked()
    if (checked !== data.active) await checkbox.click()
  }
}

async function createClientThroughUi(
  page: Page,
  options: { name: string; branchName: string; document?: string; phone?: string },
) {
  await openNewClientDialog(page)
  await fillClientForm(page, {
    name: options.name,
    branchName: options.branchName,
    document: options.document ?? uniqueDocument(),
    phone: options.phone ?? '11999990000',
  })
  await page.getByRole('button', { name: 'Salvar Cliente' }).click()
  await expectToast(page, 'Cliente cadastrado com sucesso.')
  await expect(clientRow(page, options.name)).toBeVisible()
}

async function seedClientSet(companyId: string, branches: ClientBranchSet) {
  const primary = await createClientRecord(companyId, {
    name: `${E2E_CLIENT_PREFIX} Silva Centro`,
    document: uniqueDocument(),
    phone: '(11) 91111-1111',
    email: 'silva-centro@assistencianet.test',
    branchId: branches.primary.id,
    city: 'São Paulo',
    state: 'SP',
    street: 'Rua Centro',
    number: '100',
    notes: `${CLIENT_NOTES_PREFIX}-centro: cliente importante`,
    classification: 'vip',
    classificationManual: true,
    createdAt: '2026-03-01T10:00:00Z',
  })
  const secondary = await createClientRecord(companyId, {
    name: `${E2E_CLIENT_PREFIX} Souza Norte`,
    document: uniqueDocument(),
    phone: '(19) 92222-2222',
    email: 'souza-norte@assistencianet.test',
    branchId: branches.secondary.id,
    city: 'Campinas',
    state: 'SP',
    street: 'Av Norte',
    notes: `${CLIENT_NOTES_PREFIX}-norte`,
    classification: 'recorrente',
    classificationManual: false,
    createdAt: '2026-03-02T10:00:00Z',
  })
  const inactive = await createClientRecord(companyId, {
    name: `${E2E_CLIENT_PREFIX} Inativo Pereira`,
    document: uniqueDocument(),
    phone: '(11) 93333-3333',
    branchId: branches.primary.id,
    notes: `${CLIENT_NOTES_PREFIX}-inativo`,
    active: false,
    classification: 'inadimplente',
    classificationManual: true,
    createdAt: '2026-03-03T10:00:00Z',
  })
  const deletedBy = (await getUserIdByEmail(E2E_EMAIL))!
  const deleted = await createClientRecord(companyId, {
    name: `${E2E_CLIENT_PREFIX} Excluído`,
    document: uniqueDocument(),
    phone: '(11) 94444-4444',
    branchId: branches.primary.id,
    notes: `${CLIENT_NOTES_PREFIX}-excluido`,
    createdAt: '2026-03-04T10:00:00Z',
  })
  await softDeleteClient(deleted.id, deletedBy)

  return { primary, secondary, inactive, deleted }
}

async function openFilter(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(`^${title}`) }).click()
}

async function toggleVisibleFilterOption(page: Page, option: string) {
  await page.getByRole('button', { name: new RegExp(`: ${option}$`) }).click()
}

test.describe('Clientes — cobertura do caderno manual', () => {
  test.beforeAll(async () => {
    await cleanupClientE2EArtifacts()
  })

  test.afterAll(async () => {
    await cleanupClientE2EArtifacts()
  })

  test.describe('Acesso e autorização', () => {
    test.beforeEach(async () => {
      await resetClientE2EData()
    })

    test.describe('TC-CLI-001 — acesso sem sessão', () => {
      test.use({ storageState: { cookies: [], origins: [] } })

      test('redireciona usuário não autenticado para login', async ({ page }) => {
        await page.goto('/dashboard/clientes')
        await expect(page).toHaveURL(/\/login/)
      })
    })

    test('TC-CLI-002, TC-CLI-003 e TC-CLI-004 — bloqueia atendente/técnico e permite owner/admin', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const atendente = await createEmployeeWithAccess(companyId, {
        name: `${E2E_CLIENT_PREFIX} RBAC Atendente`,
        role: 'atendente',
        email: `${EMPLOYEE_EMAIL_PREFIX}cli-atendente@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const tecnico = await createEmployeeWithAccess(companyId, {
        name: `${E2E_CLIENT_PREFIX} RBAC Técnico`,
        role: 'tecnico',
        email: `${EMPLOYEE_EMAIL_PREFIX}cli-tecnico@assistencianet.test`,
        branchId: branches.primary.id,
      })
      const admin = await createEmployeeWithAccess(companyId, {
        name: `${E2E_CLIENT_PREFIX} RBAC Admin`,
        role: 'admin',
        email: `${EMPLOYEE_EMAIL_PREFIX}cli-admin@assistencianet.test`,
        branchId: branches.primary.id,
      })

      await loginAsEmployee(page, atendente.user.email)
      await page.goto('/dashboard/clientes')
      await expect(page.getByRole('button', { name: 'Novo Cliente' })).toBeHidden()

      await loginAsEmployee(page, tecnico.user.email)
      await page.goto('/dashboard/clientes')
      await expect(page.getByRole('button', { name: 'Novo Cliente' })).toBeHidden()

      await loginAsEmployee(page, admin.user.email)
      await page.goto('/dashboard/clientes')
      await expect(page.getByRole('heading', { name: 'Gerenciar Clientes' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Novo Cliente' })).toBeVisible()

      await page.context().clearCookies()
      await page.goto('/login')
      await page.getByLabel('E-mail').fill(E2E_EMAIL)
      await page.locator('input[name="password"]').fill(E2E_PASSWORD)
      await page.getByRole('button', { name: 'Entrar' }).click()
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
      await page.goto('/dashboard/clientes')
      await expect(page.getByRole('button', { name: 'Novo Cliente' })).toBeVisible()
    })
  })

  test.describe('Listagem, busca, filtros e paginação', () => {
    test.beforeEach(async () => {
      await resetClientE2EData()
    })

    test('TC-CLI-005 — empresa sem clientes mostra vazio e desabilita busca/filtros', async ({ page }) => {
      const email = `${EMPLOYEE_EMAIL_PREFIX}cli-empresa-vazia@assistencianet.test`
      const { user, company } = await createCompanyWithOwner(email, 'Empresa E2E Clientes Vazia')

      await loginAsEmployee(page, user.email, 'E2eFiliais@2026!')
      await page.goto('/dashboard/clientes')

      await expect(page.getByText('Nenhum cliente cadastrado')).toBeVisible()
      await expect(page.getByPlaceholder('Filtrar clientes...')).toBeDisabled()
      await expect(page.getByRole('button', { name: /Filial de origem/ })).toBeDisabled()
      await expect(page.getByRole('button', { name: /Status/ })).toBeDisabled()
      await expect(page.getByRole('button', { name: /Classificação/ })).toBeDisabled()
      await withDb((client) => client.query('DELETE FROM public.companies WHERE id = $1', [company.id]))
    })

    test('TC-CLI-006 a TC-CLI-013 — tabela esconde excluídos, exibe badges, endereço e observações', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const seeded = await seedClientSet(companyId, branches)

      await page.goto('/dashboard/clientes')
      await page.getByPlaceholder('Filtrar clientes...').fill(E2E_CLIENT_PREFIX)

      await expect(clientRow(page, seeded.primary.name)).toBeVisible()
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()
      await expect(clientRow(page, seeded.inactive.name)).toBeVisible()
      await expect(clientRow(page, seeded.deleted.name)).toBeHidden()

      await expect(clientRow(page, seeded.primary.name).getByText('Ativo', { exact: true })).toBeVisible()
      await expect(clientRow(page, seeded.inactive.name).getByText('Inativo', { exact: true })).toBeVisible()
      await expect(clientRow(page, seeded.primary.name).getByText('VIP')).toBeVisible()
      await expect(clientRow(page, seeded.secondary.name).getByText('Recorrente')).toBeVisible()

      await expect(clientRow(page, seeded.primary.name).getByText('cliente importante')).toBeVisible()

      await page.setViewportSize({ width: 390, height: 844 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Cliente' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Documento' })).toBeHidden()
      await expect(page.getByRole('columnheader', { name: 'Filial de origem' })).toBeHidden()

      await page.setViewportSize({ width: 1024, height: 800 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Documento' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Filial de origem' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Endereço' })).toBeHidden()

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.reload()
      await expect(page.getByRole('columnheader', { name: 'Endereço' })).toBeVisible()
    })

    test('TC-CLI-014 a TC-CLI-026 — busca multi-campo, filtros, combinação e resultado vazio', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const seeded = await seedClientSet(companyId, branches)

      await page.goto('/dashboard/clientes')
      const search = page.getByPlaceholder('Filtrar clientes...')

      await search.fill('silva centro')
      await expect(clientRow(page, seeded.primary.name)).toBeVisible()
      await expect(clientRow(page, seeded.secondary.name)).toBeHidden()

      await search.fill(seeded.secondary.document!.slice(0, 5))
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()

      await search.fill('92222')
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()

      await search.fill('souza-norte@')
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()

      await search.fill('Av Norte')
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()

      await search.fill(`${CLIENT_NOTES_PREFIX}-inativo`)
      await expect(clientRow(page, seeded.inactive.name)).toBeVisible()
      await expect(clientRow(page, seeded.primary.name)).toBeHidden()

      await search.fill(branches.secondary.name)
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()
      await expect(clientRow(page, seeded.primary.name)).toBeHidden()

      await search.fill('')
      await openFilter(page, 'Filial de origem')
      await toggleVisibleFilterOption(page, branches.secondary.name)
      await expect(clientRow(page, seeded.secondary.name)).toBeVisible()
      await expect(clientRow(page, seeded.primary.name)).toBeHidden()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await openFilter(page, 'Status')
      await toggleVisibleFilterOption(page, 'Inativos')
      await expect(clientRow(page, seeded.inactive.name)).toBeVisible()
      await expect(clientRow(page, seeded.primary.name)).toBeHidden()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await openFilter(page, 'Classificação')
      await toggleVisibleFilterOption(page, 'VIP')
      await expect(clientRow(page, seeded.primary.name)).toBeVisible()
      await expect(clientRow(page, seeded.secondary.name)).toBeHidden()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await search.fill('não existe qualquer')
      await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible()
      await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
      await expect(clientRow(page, seeded.primary.name)).toBeVisible()
    })

    test('TC-CLI-027 a TC-CLI-029 — paginação, troca de tamanho e reset ao filtrar', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      for (let i = 1; i <= 14; i++) {
        await createClientRecord(companyId, {
          name: `${E2E_CLIENT_PREFIX} Pag ${String(i).padStart(2, '0')}`,
          document: uniqueDocument(),
          phone: `(11) 9${String(i).padStart(4, '0')}-0000`,
          branchId: branches.primary.id,
          notes: `${CLIENT_NOTES_PREFIX}-pag-${i}`,
        })
      }

      await page.goto('/dashboard/clientes')
      await page.getByPlaceholder('Filtrar clientes...').fill(`${E2E_CLIENT_PREFIX} Pag`)
      await expect(page.getByText(/Mostrando 10 de 14/)).toBeVisible()
      await expect(page.getByText(/Pagina 1 de 2/)).toBeVisible()

      await page.getByRole('combobox', { name: 'Linhas por pagina' }).click()
      await page.getByRole('option', { name: '25' }).click()
      await expect(page.getByText(/Pagina 1 de 1/)).toBeVisible()

      await page.getByRole('combobox', { name: 'Linhas por pagina' }).click()
      await page.getByRole('option', { name: '10' }).click()
      await page.locator('button[title="Ultima pagina"]').click()
      await expect(page.getByText(/Pagina 2 de 2/)).toBeVisible()

      await page.getByPlaceholder('Filtrar clientes...').fill('Pag 01')
      await expect(page.getByText(/Pagina 1 de 1/)).toBeVisible()
    })
  })

  test.describe('Cadastro, validações e unicidade', () => {
    test.beforeEach(async () => {
      await resetClientE2EData()
    })

    test('TC-CLI-030 a TC-CLI-045 — validações, máscaras, UF, classificação e observações', async ({ page }) => {
      const { branches } = await resetClientE2EData()
      await openNewClientDialog(page)
      const dialog = page.getByRole('dialog')

      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/Nome.*obrigatório/i)).toBeVisible()
      await expect(dialog.getByText(/CPF.*CNPJ.*obrigatório/i)).toBeVisible()
      await expect(dialog.getByText(/Telefone.*obrigatório/i)).toBeVisible()

      await dialog.getByLabel(/Nome completo/).fill('AB')
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/mínimo.*3/i)).toBeVisible()

      await dialog.getByLabel(/Nome completo/).fill('A'.repeat(121))
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/máximo.*120/i)).toBeVisible()

      await dialog.getByLabel('CPF/CNPJ *').fill('123')
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/CPF.*CNPJ válido|Informe.*CPF/i).first()).toBeVisible()

      await dialog.getByLabel('CPF/CNPJ *').fill('12345678901')
      await expect(dialog.getByLabel('CPF/CNPJ *')).toHaveValue('123.456.789-01')

      await dialog.getByLabel('Telefone / WhatsApp *').fill('11987654321')
      await expect(dialog.getByLabel('Telefone / WhatsApp *')).toHaveValue('(11) 98765-4321')

      await dialog.getByLabel('Telefone / WhatsApp *').fill('123456')
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/telefone válido|Informe.*telefone/i).first()).toBeVisible()

      await dialog.getByLabel('E-mail', { exact: true }).fill('abc')
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/e-mail.*inválido/i)).toBeVisible()

      await dialog.locator('[data-slot="select-trigger"]').first().click()
      const options = page.getByRole('option')
      await expect(options).toHaveCount(27)
      await page.keyboard.press('Escape')

      await dialog.locator('[data-slot="select-trigger"]').nth(1).click()
      await expect(page.getByRole('option', { name: branches.primary.name })).toBeVisible()
      await expect(page.getByRole('option', { name: branches.secondary.name })).toBeVisible()
      await page.keyboard.press('Escape')

      const vipButton = dialog.getByRole('button', { name: 'VIP', exact: true })
      await expect(vipButton).toBeDisabled()
      await dialog.getByText('Definir manualmente', { exact: true }).click()
      await expect(vipButton).toBeEnabled()
      await vipButton.click()

      await dialog.getByPlaceholder('Informações úteis para a equipe.').fill('A'.repeat(501))
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(dialog.getByText(/máximo.*500/i)).toBeVisible()
    })

    test('TC-CLI-046 e TC-CLI-049 — ViaCEP preenche rua/cidade/estado automaticamente', async ({ page }) => {
      await resetClientE2EData()
      await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window)
        window.fetch = async (input, init) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
          if (url.includes('viacep.com.br/ws/')) {
            return new Response(
              JSON.stringify({ logradouro: 'Avenida Paulista', localidade: 'São Paulo', uf: 'SP' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            )
          }
          return originalFetch(input, init)
        }
      })
      await openNewClientDialog(page)
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('CEP').fill('01310100')
      await expect.poll(async () => dialog.getByLabel('Cidade').inputValue(), { timeout: 10_000 }).toBe('São Paulo')
      await expect(dialog.getByLabel('Rua')).toHaveValue('Avenida Paulista')
      await expect(dialog.locator('[data-slot="select-trigger"]').first()).toContainText('São Paulo (SP)')
    })

    test('TC-CLI-054 e TC-CLI-055 — cadastro com campos mínimos e cadastro completo + auditoria', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const minimalName = uniqueClientName('Mínimo')
      const minimalDoc = uniqueDocument()
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: minimalName,
        document: minimalDoc,
        phone: '(11) 98888-7777',
        branchName: branches.primary.name,
      })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente cadastrado com sucesso.')
      await expect(clientRow(page, minimalName)).toBeVisible()

      const created = await getClientByName(companyId, minimalName)
      expect(created).toMatchObject({
        name: minimalName,
        origin_branch_id: branches.primary.id,
        active: true,
      })
      await expect(getLatestClientAudit(companyId, created!.id, 'create')).resolves.toMatchObject({
        action: 'create',
      })

      const fullName = uniqueClientName('Completo')
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: fullName,
        document: uniqueDocument(),
        phone: '(11) 97777-6666',
        email: `${EMPLOYEE_EMAIL_PREFIX}cli-completo@assistencianet.test`,
        branchName: branches.secondary.name,
        street: 'Av das Flores',
        number: '500',
        complement: 'Sala 2',
        city: 'Campinas',
        state: 'SP',
        notes: `${CLIENT_NOTES_PREFIX}-completo`,
      })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente cadastrado com sucesso.')
      await expect(clientRow(page, fullName)).toBeVisible()

      const full = await getClientByName(companyId, fullName)
      expect(full).toMatchObject({
        state: 'SP',
        city: 'Campinas',
        street: 'Av das Flores',
        number: '500',
      })
    })

    test('TC-CLI-057 e TC-CLI-058 — loading disable e cancelar', async ({ page }) => {
      const { branches } = await resetClientE2EData()
      const loadingName = uniqueClientName('Loading')
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: loadingName,
        document: uniqueDocument(),
        phone: '(11) 96666-5555',
        branchName: branches.primary.name,
      })
      await delayNextMutation(page)
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(page.getByRole('button', { name: 'Carregando...' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      await expect(clientRow(page, loadingName)).toBeVisible({ timeout: 15_000 })

      const cancelledName = uniqueClientName('Cancelado')
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: cancelledName,
        document: uniqueDocument(),
        phone: '(11) 95555-4444',
        branchName: branches.primary.name,
      })
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(clientRow(page, cancelledName)).toBeHidden()
    })

    test('TC-CLI-059 a TC-CLI-063 — unicidade de documento, reuso após soft delete e edição', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      // Nota: índice único local usa regexp_replace literal '\D' — não normaliza.
      // Usamos o mesmo formato mascarado em ambos para garantir colisão determinística.
      const existingDocRaw = uniqueDocument()
      const existingDocFormatted = `${existingDocRaw.slice(0, 3)}.${existingDocRaw.slice(3, 6)}.${existingDocRaw.slice(6, 9)}-${existingDocRaw.slice(9, 11)}`
      const existing = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Doc Usado`,
        document: existingDocFormatted,
        phone: '(11) 94444-3333',
        branchId: branches.primary.id,
      })
      const deletedDocRaw = uniqueDocument()
      const deletedDocFormatted = `${deletedDocRaw.slice(0, 3)}.${deletedDocRaw.slice(3, 6)}.${deletedDocRaw.slice(6, 9)}-${deletedDocRaw.slice(9, 11)}`
      const deletedClient = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Doc Excluído`,
        document: deletedDocFormatted,
        phone: '(11) 93333-2222',
        branchId: branches.primary.id,
      })
      await softDeleteClient(deletedClient.id, (await getUserIdByEmail(E2E_EMAIL))!)

      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: uniqueClientName('Duplicado'),
        document: existingDocRaw,
        phone: '(11) 92222-1111',
        branchName: branches.primary.name,
      })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expect(page.getByText(/Já existe um cliente ativo|já.*cadastrado/i).first()).toBeVisible()
      await page.getByRole('button', { name: 'Cancelar' }).click()

      const reuseName = uniqueClientName('Reuso Doc Excluído')
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: reuseName,
        document: deletedDocRaw,
        phone: '(11) 91111-0000',
        branchName: branches.primary.name,
      })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente cadastrado com sucesso.')
      await expect(clientRow(page, reuseName)).toBeVisible()

      await page.getByRole('button', { name: `Editar cliente ${existing.name}` }).click()
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente atualizado com sucesso.')
    })
  })

  test.describe('Edição e soft delete', () => {
    test.beforeEach(async () => {
      await resetClientE2EData()
    })

    test('TC-CLI-064 a TC-CLI-071 — edição básica, multi-tenant e diálogo não mistura dados', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const client = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Editável`,
        document: uniqueDocument(),
        phone: '(11) 99911-2233',
        branchId: branches.primary.id,
      })
      const other = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Outro Na Tela`,
        document: uniqueDocument(),
        phone: '(11) 99922-3344',
        branchId: branches.secondary.id,
      })

      await page.goto('/dashboard/clientes')
      await page.getByRole('button', { name: `Editar cliente ${client.name}` }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByLabel(/Nome completo/)).toHaveValue(client.name)
      await fillClientForm(page, { phone: '(11) 98877-6655' })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente atualizado com sucesso.')
      await expect(clientRow(page, client.name).getByText('(11) 98877-6655')).toBeVisible()
      await expect(getLatestClientAudit(companyId, client.id, 'update')).resolves.toMatchObject({
        action: 'update',
      })

      await page.getByRole('button', { name: `Editar cliente ${other.name}` }).click()
      await expect(dialog.getByLabel(/Nome completo/)).toHaveValue(other.name)
      await page.getByRole('button', { name: 'Cancelar' }).click()

      const otherTenant = await createCompanyWithOwner(
        `${EMPLOYEE_EMAIL_PREFIX}cli-tenant-owner@assistencianet.test`,
        'Empresa B Clientes',
      )
      const outsider = await createClientRecord(otherTenant.company.id, {
        name: `${E2E_CLIENT_PREFIX} Outro Tenant`,
        document: uniqueDocument(),
        phone: '(11) 90000-0000',
        branchId: null,
      })
      await page.goto('/dashboard/clientes')
      await expect(clientRow(page, outsider.name)).toBeHidden()
    })

    test('TC-CLI-072 a TC-CLI-078 — soft delete arquiva documento, preserva histórico e cancelamento', async ({ page }) => {
      const { companyId, branches } = await resetClientE2EData()
      const client = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Para Excluir`,
        document: uniqueDocument(),
        phone: '(11) 98765-4321',
        branchId: branches.primary.id,
      })
      const originalDoc = client.document!

      await page.goto('/dashboard/clientes')
      await page.getByRole('button', { name: `Excluir cliente ${client.name}` }).click()
      await expect(page.getByRole('heading', { name: 'Excluir Cliente' })).toBeVisible()
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await expect(clientRow(page, client.name)).toBeVisible()

      await page.getByRole('button', { name: `Excluir cliente ${client.name}` }).click()
      await expect(page.getByRole('heading', { name: 'Excluir Cliente' })).toBeVisible()
      await page.locator('button:has-text("Excluir da Listagem")').click()
      await expect.poll(() => getClientById(client.id).then((c) => c?.deleted_at), { timeout: 15_000 }).not.toBeNull()

      const afterDelete = await getClientById(client.id)
      expect(afterDelete).toMatchObject({
        active: false,
        deleted_by: expect.any(String),
      })
      expect(afterDelete?.deleted_at).not.toBeNull()
      expect(afterDelete?.document).not.toBe(originalDoc)
      expect(afterDelete?.document).toContain('[deleted:')

      await expect
        .poll(() => getLatestClientAudit(companyId, client.id, 'soft_delete'), { timeout: 10_000 })
        .toMatchObject({ action: 'soft_delete' })

      await page.reload()
      await expect(clientRow(page, client.name)).toBeHidden()

      const reuseName = uniqueClientName('Reuso CPF')
      await openNewClientDialog(page)
      await fillClientForm(page, {
        name: reuseName,
        document: originalDoc,
        phone: '(11) 92222-3333',
        branchName: branches.primary.name,
      })
      await page.getByRole('button', { name: 'Salvar Cliente' }).click()
      await expectToast(page, 'Cliente cadastrado com sucesso.')
      await expect(clientRow(page, reuseName)).toBeVisible()
    })
  })

  test.describe('Casos de borda', () => {
    test.beforeEach(async () => {
      await resetClientE2EData()
    })

    test('TC-CLI-083 e TC-CLI-084 — nomes especiais e XSS não executam scripts', async ({ page }) => {
      const { branches } = await resetClientE2EData()
      const specialName = `${E2E_CLIENT_PREFIX} José D'Ávila & Cia.`
      await createClientThroughUi(page, { name: specialName, branchName: branches.primary.name })
      await expect(clientRow(page, specialName)).toBeVisible()

      let dialogOpened = false
      page.on('dialog', async (dialog) => {
        dialogOpened = true
        await dialog.dismiss()
      })
      const xssName = `${E2E_CLIENT_PREFIX} <img src=x onerror=alert(1)>`
      await createClientThroughUi(page, { name: xssName, branchName: branches.primary.name })
      await expect(page.getByText(xssName)).toBeVisible()
      expect(dialogOpened).toBe(false)
    })

    test('TC-CLI-085 e TC-CLI-086 — edição concorrente e deletar já deletado', async ({ browser }) => {
      const { companyId, branches } = await resetClientE2EData()
      const client = await createClientRecord(companyId, {
        name: `${E2E_CLIENT_PREFIX} Concorrente`,
        document: uniqueDocument(),
        phone: '(11) 91111-9999',
        branchId: branches.primary.id,
      })
      const contextA = await browser.newContext({ storageState: '.auth/session.json' })
      const contextB = await browser.newContext({ storageState: '.auth/session.json' })
      const pageA = await contextA.newPage()
      const pageB = await contextB.newPage()

      try {
        await pageA.goto('/dashboard/clientes')
        await pageB.goto('/dashboard/clientes')
        await pageA.getByRole('button', { name: `Editar cliente ${client.name}` }).click()
        await pageB.getByRole('button', { name: `Editar cliente ${client.name}` }).click()
        await pageA.getByRole('dialog').getByLabel('Telefone / WhatsApp *').fill('11911110000')
        await pageB.getByRole('dialog').getByLabel('Telefone / WhatsApp *').fill('11922220000')
        await pageA.getByRole('button', { name: 'Salvar Cliente' }).click()
        await expectToast(pageA, 'Cliente atualizado com sucesso.')
        await pageB.getByRole('button', { name: 'Salvar Cliente' }).click()
        await expectToast(pageB, 'Cliente atualizado com sucesso.')
        await expect.poll(() => getClientById(client.id)).toMatchObject({
          phone: '(11) 92222-0000',
        })

        const stale = await createClientRecord(companyId, {
          name: `${E2E_CLIENT_PREFIX} Stale Delete`,
          document: uniqueDocument(),
          phone: '(11) 98888-1111',
          branchId: branches.primary.id,
        })
        await pageA.goto('/dashboard/clientes')
        await pageB.goto('/dashboard/clientes')
        await pageA.getByRole('button', { name: `Excluir cliente ${stale.name}` }).click()
        await pageA.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expectToast(pageA, `Cliente "${stale.name}" removido da listagem com sucesso.`)
        await pageB.getByRole('button', { name: `Excluir cliente ${stale.name}` }).click()
        await pageB.getByRole('button', { name: 'Excluir da Listagem' }).click()
        await expect(pageB.getByText(/Cliente não encontrado|já foi excluído|não pode ser|Erro/i).first()).toBeVisible({ timeout: 15_000 })
      } finally {
        await contextA.close()
        await contextB.close()
      }
    })
  })
})
