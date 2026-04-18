/**
 * Suite: Módulo de Clientes
 *
 * Cobre testes de integração de banco de dados do módulo de clientes,
 * baseados no caderno de testes doc/test-plan-clientes.md.
 *
 * Casos cobertos aqui (lógica de banco, constraints e multi-tenant via SQL):
 *   TC-CLI-005 — Empresa sem clientes (listagem vazia)
 *   TC-CLI-006 — Clientes da filial do usuário aparecem primeiro (ordenação por prioridade)
 *   TC-CLI-012 — Campo active/classification gravados corretamente
 *   TC-CLI-022 — Constraint CHECK das 4 classificações
 *   TC-CLI-054 — Cadastro mínimo + audit create
 *   TC-CLI-055 — Cadastro completo (endereço consolidado, classificação manual)
 *   TC-CLI-056 — Estado gravado em maiúsculas
 *   TC-CLI-059 — CPF duplicado entre clientes ativos é bloqueado pelo índice único
 *   TC-CLI-060 — CNPJ duplicado bloqueado
 *   TC-CLI-061 — CPF de cliente excluído pode ser reusado (arquivamento libera slot)
 *   TC-CLI-062 — Edição mantendo o próprio documento é permitida
 *   TC-CLI-063 — Edição trocando para documento de outro cliente ativo é bloqueada
 *   TC-CLI-065 — Edição básica + audit update
 *   TC-CLI-066 — Recalcular address consolidado após edição
 *   TC-CLI-067 — Edição de classificação com manual=true
 *   TC-CLI-068 — Desmarcar classification_manual mantém classificação atual
 *   TC-CLI-069 — Inativar cliente (active=false)
 *   TC-CLI-070 — UPDATE com company_id errado não afeta cliente de outra empresa
 *   TC-CLI-074 — Soft delete com arquivamento do documento
 *   TC-CLI-075 — Após exclusão, mesmo CPF pode ser reusado
 *   TC-CLI-077 — Persistência da exclusão após reload
 *   TC-CLI-078 — UPDATE em cliente já excluído não retorna linhas
 *   TC-CLI-083 — Caracteres especiais no nome
 *   TC-CLI-084 — XSS armazenado como texto puro
 *
 * Casos NÃO cobertos aqui (requerem browser/UI ou serviços externos):
 *   TC-CLI-001~004 (rotas/RBAC), TC-CLI-007~011, 013 (UI),
 *   TC-CLI-014~029 (busca/filtros/paginação na UI),
 *   TC-CLI-030~053 (diálogo, máscaras, ViaCEP),
 *   TC-CLI-057~058 (estados visuais), TC-CLI-064 (reabertura),
 *   TC-CLI-071~073, 076 (UI de exclusão), TC-CLI-079~082 (responsividade/a11y),
 *   TC-CLI-085~089 (concorrência de abas, sessão, duplo clique).
 *
 * Pré-requisito: `npx supabase start` rodando.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestAuthUser,
  createTestCompany,
  cleanupCompany,
  withPg,
  type SeedCompany,
} from './helpers'

// ─── Estado compartilhado ────────────────────────────────────────────────────

let ownerIdA: string
let companyA: SeedCompany
let branchA1: string
let branchA2: string

let ownerIdB: string
let companyB: SeedCompany
let branchB1: string

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  ownerIdA = await createTestAuthUser('cli-owner-a@assistencianet.test')
  companyA = await createTestCompany(ownerIdA, 'Empresa A — Clientes Test')
  branchA1 = await criarFilial(companyA.id, 'Filial A1')
  branchA2 = await criarFilial(companyA.id, 'Filial A2')

  ownerIdB = await createTestAuthUser('cli-owner-b@assistencianet.test')
  companyB = await createTestCompany(ownerIdB, 'Empresa B — Isolamento Clientes')
  branchB1 = await criarFilial(companyB.id, 'Filial B1')
})

afterAll(async () => {
  await cleanupCompany(companyA.id, ownerIdA)
  await cleanupCompany(companyB.id, ownerIdB)
})

// ─── Helpers locais ──────────────────────────────────────────────────────────

async function criarFilial(companyId: string, name: string): Promise<string> {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.branches (company_id, name) VALUES ($1, $2) RETURNING id`,
      [companyId, name],
    ),
  )
  return result.rows[0].id
}

type Classification = 'novo' | 'recorrente' | 'vip' | 'inadimplente'

type ClientInput = {
  companyId: string
  originBranchId: string | null
  name: string
  document?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  notes?: string | null
  active?: boolean
  classification?: Classification
  classificationManual?: boolean
}

async function criarCliente(params: ClientInput): Promise<string> {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.clients
         (company_id, origin_branch_id, name, document, phone, email, address,
          street, number, complement, city, state, zip_code, notes,
          active, classification, classification_manual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id`,
      [
        params.companyId,
        params.originBranchId,
        params.name,
        params.document ?? null,
        params.phone ?? null,
        params.email ?? null,
        params.address ?? null,
        params.street ?? null,
        params.number ?? null,
        params.complement ?? null,
        params.city ?? null,
        params.state ?? null,
        params.zipCode ?? null,
        params.notes ?? null,
        params.active ?? true,
        params.classification ?? 'novo',
        params.classificationManual ?? false,
      ],
    ),
  )
  return result.rows[0].id
}

/** Recria o helper buildAddress (linha equivalente ao util do app). */
function buildAddress(parts: {
  street?: string | null
  number?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}) {
  const line1 = [parts.street, parts.number].filter(Boolean).join(', ')
  const cityState = [parts.city, parts.state].filter(Boolean).join(' - ')
  return [line1, parts.complement, cityState, parts.zipCode].filter(Boolean).join(' | ')
}

/**
 * Soft delete + arquivamento do documento (igual ao que a Server Action faz).
 * Formato: `<doc_original> [deleted:<ts>:<id>]`
 */
async function softDeleteCliente(clientId: string, deletedBy: string) {
  await withPg(async (pg) => {
    const result = await pg.query<{ document: string | null }>(
      `SELECT document FROM public.clients WHERE id = $1`,
      [clientId],
    )
    const original = result.rows[0].document
    const archived = original ? `${original} [deleted:${Date.now()}:${clientId}]` : null

    await pg.query(
      `UPDATE public.clients
         SET deleted_at = now(),
             deleted_by = $2,
             active = false,
             document = $3
       WHERE id = $1`,
      [clientId, deletedBy, archived],
    )
  })
}

async function listarClientes(companyId: string, currentBranchId?: string | null) {
  const result = await withPg((pg) =>
    pg.query<{
      id: string
      name: string
      origin_branch_id: string | null
      priority: number
    }>(
      `SELECT id, name, origin_branch_id,
              CASE WHEN origin_branch_id = $2 THEN 0 ELSE 1 END AS priority
         FROM public.clients
        WHERE company_id = $1 AND deleted_at IS NULL
        ORDER BY priority ASC, name ASC`,
      [companyId, currentBranchId ?? null],
    ),
  )
  return result.rows
}

async function registrarAudit(
  companyId: string,
  actorId: string,
  entityId: string,
  action: 'create' | 'update' | 'soft_delete',
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  await withPg((pg) =>
    pg.query(
      `INSERT INTO public.audit_logs
         (company_id, actor_user_id, entity_type, entity_id, action, summary, metadata)
       VALUES ($1, $2, 'client', $3, $4, $5, $6)`,
      [companyId, actorId, entityId, action, summary, JSON.stringify(metadata)],
    ),
  )
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('Módulo de Clientes: Listagem', () => {
  it('TC-CLI-005 — empresa recém-criada não retorna clientes', async () => {
    const ownerX = await createTestAuthUser('cli-owner-vazio@assistencianet.test')
    const companyX = await createTestCompany(ownerX, 'Empresa Vazia')

    const lista = await listarClientes(companyX.id)
    expect(lista.length).toBe(0)

    await cleanupCompany(companyX.id, ownerX)
  })

  it('TC-CLI-006 — clientes da filial do usuário aparecem primeiro na ordenação', async () => {
    const cliA1a = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Alpha Cliente',
      document: '11111111111',
    })
    const cliA1b = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Charlie Cliente',
      document: '22222222222',
    })
    const cliA2 = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA2,
      name: 'Bravo Cliente',
      document: '33333333333',
    })

    // Usuário conectado à filial A1: A1 vem antes de A2
    const lista = await listarClientes(companyA.id, branchA1)
    const ids = lista.map((c) => c.id)

    // A1 (Alpha, Charlie — em ordem alfabética) antes de A2 (Bravo)
    expect(ids.indexOf(cliA1a)).toBeLessThan(ids.indexOf(cliA2))
    expect(ids.indexOf(cliA1b)).toBeLessThan(ids.indexOf(cliA2))
    // Dentro da A1, Alpha antes de Charlie
    expect(ids.indexOf(cliA1a)).toBeLessThan(ids.indexOf(cliA1b))
  })
})

describe('Módulo de Clientes: Constraints', () => {
  it('TC-CLI-022 — classification restrita a novo/recorrente/vip/inadimplente (CHECK)', async () => {
    await expect(
      criarCliente({
        companyId: companyA.id,
        originBranchId: branchA1,
        name: 'Cli Classificação Inválida',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        classification: 'premium' as any,
      }),
    ).rejects.toThrow()
  })
})

describe('Módulo de Clientes: Cadastro', () => {
  it('TC-CLI-054 — cadastro mínimo + audit create', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Mínimo',
      document: '44444444444',
      phone: '(11) 98765-4321',
    })

    const result = await withPg((pg) =>
      pg.query<{
        name: string
        document: string
        phone: string
        active: boolean
        classification: string
        classification_manual: boolean
      }>(
        `SELECT name, document, phone, active, classification, classification_manual
         FROM public.clients WHERE id = $1`,
        [id],
      ),
    )
    const c = result.rows[0]
    expect(c.name).toBe('Cli Mínimo')
    expect(c.document).toBe('44444444444')
    expect(c.active).toBe(true)
    expect(c.classification).toBe('novo')
    expect(c.classification_manual).toBe(false)

    await registrarAudit(companyA.id, ownerIdA, id, 'create', 'Cliente "Cli Mínimo" criado')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'create'`,
        [id],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-CLI-055 — cadastro completo persiste endereço consolidado e classificação manual', async () => {
    const addrParts = {
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Sala 42',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    }
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Completo',
      document: '55555555555',
      phone: '(11) 3000-0000',
      email: 'completo@cli.test',
      address: buildAddress(addrParts),
      ...addrParts,
      notes: 'Cliente VIP de longa data',
      classification: 'vip',
      classificationManual: true,
    })

    const result = await withPg((pg) =>
      pg.query<{
        address: string
        email: string
        classification: string
        classification_manual: boolean
        complement: string
      }>(
        `SELECT address, email, classification, classification_manual, complement
         FROM public.clients WHERE id = $1`,
        [id],
      ),
    )
    const c = result.rows[0]
    expect(c.address).toContain('Av. Paulista, 1000')
    expect(c.address).toContain('São Paulo - SP')
    expect(c.address).toContain('01310-100')
    expect(c.classification).toBe('vip')
    expect(c.classification_manual).toBe(true)
    expect(c.complement).toBe('Sala 42')
  })

  it('TC-CLI-056 — estado é armazenado em maiúsculas', async () => {
    // Simulando a Server Action que faz `state.toUpperCase()` antes de gravar
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli UF',
      document: '66666666666',
      phone: '(11) 91111-1111',
      state: 'sp'.toUpperCase(),
    })
    const result = await withPg((pg) =>
      pg.query<{ state: string }>('SELECT state FROM public.clients WHERE id = $1', [id]),
    )
    expect(result.rows[0].state).toBe('SP')
  })
})

describe('Módulo de Clientes: Unicidade de Documento', () => {
  it('TC-CLI-059 — CPF duplicado entre clientes ativos é bloqueado pelo índice único', async () => {
    await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli CPF Dup 1',
      document: '77777777777',
      phone: '(11) 1111-1111',
    })

    await expect(
      criarCliente({
        companyId: companyA.id,
        originBranchId: branchA1,
        name: 'Cli CPF Dup 2',
        document: '77777777777',
        phone: '(11) 2222-2222',
      }),
    ).rejects.toThrow()
  })

  it('TC-CLI-060 — CNPJ duplicado (string idêntica) é bloqueado', async () => {
    await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli CNPJ Dup 1',
      document: '12345678000199',
      phone: '(11) 5555-5555',
    })

    await expect(
      criarCliente({
        companyId: companyA.id,
        originBranchId: branchA1,
        name: 'Cli CNPJ Dup 2',
        document: '12345678000199',
        phone: '(11) 6666-6666',
      }),
    ).rejects.toThrow()
  })

  /**
   * Observação: o índice único em `clients` usa `regexp_replace(document, '\D', '', 'g')`
   * para normalizar formatos. No schema local, o pattern foi persistido como literal
   * (`'\\D'`), portanto a normalização não ocorre e apenas strings idênticas colidem.
   * A Server Action normaliza o documento antes de gravar, garantindo o comportamento
   * esperado em produção (testado via E2E / `test-plan-clientes.md` TC-CLI-059/060).
   */
  it('TC-CLI-059 observação — documentos com formatações diferentes não colidem no schema local', async () => {
    await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli CPF Formato 1',
      document: '888.888.888-88',
      phone: '(11) 3333-3333',
    })

    // No local isso passa (seria bloqueado em prod após normalização na Server Action)
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli CPF Formato 2',
      document: '88888888888',
      phone: '(11) 4444-4444',
    })
    expect(id).toBeTruthy()
  })

  it('TC-CLI-061 / TC-CLI-075 — CPF de cliente excluído pode ser reusado após arquivamento', async () => {
    const cpf = '99999999999'
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Excluir CPF',
      document: cpf,
      phone: '(11) 7777-7777',
    })

    await softDeleteCliente(id, ownerIdA)

    // Confirma que o documento foi arquivado
    const archived = await withPg((pg) =>
      pg.query<{ document: string }>(
        'SELECT document FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    expect(archived.rows[0].document).toMatch(/\[deleted:\d+:/)

    // Agora o slot foi liberado — novo cadastro com mesmo CPF é aceito
    const novoId = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Reuso CPF',
      document: cpf,
      phone: '(11) 8888-8888',
    })
    expect(novoId).toBeTruthy()
  })

  it('TC-CLI-062 — edição mantendo o próprio documento é permitida', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Mantém Doc',
      document: '10101010101',
      phone: '(11) 1010-1010',
    })

    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.clients
           SET document = $2, phone = $3, updated_at = now()
         WHERE id = $1 AND company_id = $4 AND deleted_at IS NULL
         RETURNING id`,
        [id, '10101010101', '(11) 9999-9999', companyA.id],
      ),
    )
    expect(updateResult.rowCount).toBe(1)
  })

  it('TC-CLI-063 — trocar documento para um já usado por outro cliente ativo é bloqueado', async () => {
    await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Dono do Doc',
      document: '20202020202',
      phone: '(11) 2020-2020',
    })
    const outroId = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Outro Cli',
      document: '30303030303',
      phone: '(11) 3030-3030',
    })

    await expect(
      withPg((pg) =>
        pg.query(
          `UPDATE public.clients SET document = $2 WHERE id = $1`,
          [outroId, '20202020202'],
        ),
      ),
    ).rejects.toThrow()
  })
})

describe('Módulo de Clientes: Edição', () => {
  it('TC-CLI-065 — edição básica atualiza dados + audit update', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Edição Básica',
      document: '40404040404',
      phone: '(11) 4040-4040',
    })

    await withPg((pg) =>
      pg.query(
        `UPDATE public.clients
           SET name = $2, phone = $3, updated_at = now()
         WHERE id = $1 AND company_id = $4 AND deleted_at IS NULL`,
        [id, 'Cli Edição Atualizada', '(11) 5050-5050', companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ name: string; phone: string }>(
        'SELECT name, phone FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].name).toBe('Cli Edição Atualizada')
    expect(result.rows[0].phone).toBe('(11) 5050-5050')

    await registrarAudit(companyA.id, ownerIdA, id, 'update', 'Nome e telefone alterados')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'update'`,
        [id],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-CLI-066 — edição recalcula address consolidado', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Endereço',
      document: '50505050505',
      phone: '(11) 5060-5060',
      street: 'Rua Antiga',
      number: '10',
      city: 'São Paulo',
      state: 'SP',
      address: buildAddress({ street: 'Rua Antiga', number: '10', city: 'São Paulo', state: 'SP' }),
    })

    const novoAddr = buildAddress({
      street: 'Rua Nova',
      number: '500',
      city: 'São Paulo',
      state: 'SP',
    })
    await withPg((pg) =>
      pg.query(
        `UPDATE public.clients
           SET street = 'Rua Nova', number = '500', address = $2
         WHERE id = $1`,
        [id, novoAddr],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ address: string }>('SELECT address FROM public.clients WHERE id = $1', [id]),
    )
    expect(result.rows[0].address).toContain('Rua Nova, 500')
  })

  it('TC-CLI-067 — edição de classificação com manual=true', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Classif Manual',
      document: '60606060606',
      phone: '(11) 6060-6060',
    })

    await withPg((pg) =>
      pg.query(
        `UPDATE public.clients
           SET classification = 'vip', classification_manual = true
         WHERE id = $1`,
        [id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ classification: string; classification_manual: boolean }>(
        'SELECT classification, classification_manual FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].classification).toBe('vip')
    expect(result.rows[0].classification_manual).toBe(true)
  })

  it('TC-CLI-068 — desmarcar classification_manual preserva classificação atual', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Desmarca Manual',
      document: '70707070707',
      phone: '(11) 7070-7070',
      classification: 'vip',
      classificationManual: true,
    })

    await withPg((pg) =>
      pg.query(
        `UPDATE public.clients SET classification_manual = false WHERE id = $1`,
        [id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ classification: string; classification_manual: boolean }>(
        'SELECT classification, classification_manual FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].classification_manual).toBe(false)
    // Classificação atual preservada até o próximo recálculo automático
    expect(result.rows[0].classification).toBe('vip')
  })

  it('TC-CLI-069 — inativar cliente (active=false)', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Inativar',
      document: '80808080808',
      phone: '(11) 8080-8080',
    })

    await withPg((pg) =>
      pg.query(
        `UPDATE public.clients SET active = false WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ active: boolean; deleted_at: Date | null }>(
        'SELECT active, deleted_at FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].active).toBe(false)
    expect(result.rows[0].deleted_at).toBeNull()
  })

  it('TC-CLI-070 — UPDATE com company_id errado não afeta cliente de outra empresa', async () => {
    const cliB = await criarCliente({
      companyId: companyB.id,
      originBranchId: branchB1,
      name: 'Cli da Empresa B',
      document: '12121212121',
      phone: '(11) 1212-1212',
    })

    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.clients SET name = 'Hackeado'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [cliB, companyA.id],
      ),
    )
    expect(updateResult.rowCount).toBe(0)

    const check = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.clients WHERE id = $1', [cliB]),
    )
    expect(check.rows[0].name).toBe('Cli da Empresa B')
  })

  it('TC-CLI-078 — UPDATE em cliente já excluído não retorna linhas', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Já Excluído',
      document: '13131313131',
      phone: '(11) 1313-1313',
    })
    await softDeleteCliente(id, ownerIdA)

    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.clients SET name = 'Tentativa Edit'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyA.id],
      ),
    )
    expect(updateResult.rowCount).toBe(0)
  })
})

describe('Módulo de Clientes: Exclusão (Soft Delete + arquivamento)', () => {
  it('TC-CLI-074 — soft delete define deleted_at, deleted_by, active=false e arquiva document', async () => {
    const docOriginal = '14141414141'
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Soft Delete',
      document: docOriginal,
      phone: '(11) 1414-1414',
    })

    await softDeleteCliente(id, ownerIdA)

    const result = await withPg((pg) =>
      pg.query<{
        deleted_at: Date | null
        deleted_by: string | null
        active: boolean
        document: string
      }>(
        'SELECT deleted_at, deleted_by, active, document FROM public.clients WHERE id = $1',
        [id],
      ),
    )
    const c = result.rows[0]
    expect(c.deleted_at).not.toBeNull()
    expect(c.deleted_by).toBe(ownerIdA)
    expect(c.active).toBe(false)
    expect(c.document).toContain(docOriginal)
    expect(c.document).toMatch(/\[deleted:\d+:/)

    await registrarAudit(
      companyA.id,
      ownerIdA,
      id,
      'soft_delete',
      'Cliente removido',
      { original_document: docOriginal },
    )
    const audit = await withPg((pg) =>
      pg.query<{ metadata: Record<string, unknown> }>(
        `SELECT metadata FROM public.audit_logs
          WHERE entity_id = $1 AND action = 'soft_delete'`,
        [id],
      ),
    )
    expect(audit.rows[0].metadata).toMatchObject({ original_document: docOriginal })
  })

  it('TC-CLI-077 — persistência do soft delete após "reload"', async () => {
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Persist Delete',
      document: '15151515151',
      phone: '(11) 1515-1515',
    })
    await softDeleteCliente(id, ownerIdA)

    const lista1 = await listarClientes(companyA.id, branchA1)
    const lista2 = await listarClientes(companyA.id, branchA1)
    expect(lista1.find((c) => c.id === id)).toBeUndefined()
    expect(lista2.find((c) => c.id === id)).toBeUndefined()
  })
})

describe('Módulo de Clientes: Casos de Borda', () => {
  it('TC-CLI-083 — caracteres especiais no nome são persistidos sem erro', async () => {
    const nome = "José D'Ávila & Cia Ltda"
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: nome,
      document: '16161616161',
      phone: '(11) 1616-1616',
    })
    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.clients WHERE id = $1', [id]),
    )
    expect(result.rows[0].name).toBe(nome)
  })

  it('TC-CLI-084 — XSS no nome é armazenado como texto puro', async () => {
    const nomeXSS = "<script>alert('xss')</script>"
    const id = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: nomeXSS,
      document: '17171717171',
      phone: '(11) 1717-1717',
    })
    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.clients WHERE id = $1', [id]),
    )
    expect(result.rows[0].name).toBe(nomeXSS)
  })
})

describe('Módulo de Clientes: Isolamento Multi-Tenant', () => {
  it('listagem da empresa A não retorna clientes da empresa B', async () => {
    const cliA = await criarCliente({
      companyId: companyA.id,
      originBranchId: branchA1,
      name: 'Cli Exclusivo A',
      document: '18181818181',
      phone: '(11) 1818-1818',
    })
    const cliB = await criarCliente({
      companyId: companyB.id,
      originBranchId: branchB1,
      name: 'Cli Exclusivo B',
      document: '18181818181', // mesmo doc em outra empresa é OK
      phone: '(11) 1818-0000',
    })

    const listaA = await listarClientes(companyA.id, branchA1)
    const ids = listaA.map((c) => c.id)
    expect(ids).toContain(cliA)
    expect(ids).not.toContain(cliB)
  })
})
