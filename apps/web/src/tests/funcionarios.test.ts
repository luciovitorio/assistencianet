/**
 * Suite: Módulo de Funcionários
 *
 * Cobre testes de integração de banco de dados do módulo de funcionários,
 * baseados no caderno de testes doc/test-plan-funcionarios.md.
 *
 * Casos cobertos aqui (lógica de banco, constraints e multi-tenant via SQL):
 *   TC-FUNC-007 — Funcionários soft-deleted não aparecem na listagem
 *   TC-FUNC-009 — Badge "Inativo" (active = false)
 *   TC-FUNC-011 — labor_rate preenchido apenas para técnico
 *   TC-FUNC-033 — Select de Filial mostra somente filiais ativas (listagem filtrada)
 *   TC-FUNC-034 — Role restrito aos 3 valores (constraint CHECK)
 *   TC-FUNC-040 — Mão de obra: valor negativo rejeitado (constraint CHECK)
 *   TC-FUNC-041 — Mão de obra vazia (NULL) é aceita
 *   TC-FUNC-042 — Mão de obra decimal aceita
 *   TC-FUNC-043 — Cadastro mínimo + audit_log create
 *   TC-FUNC-044 — Cadastro com todos os campos
 *   TC-FUNC-048 — Unicidade de email entre funcionários ativos
 *   TC-FUNC-050 — Email normalizado (trim + lowercase) bloqueado por índice case-insensitive
 *   TC-FUNC-051 — Edição mantendo o próprio e-mail é permitida
 *   TC-FUNC-052 — Edição trocando para e-mail de outro funcionário é bloqueada
 *   TC-FUNC-053 — Edição básica + audit_log update
 *   TC-FUNC-055 — Desativar funcionário com acesso limpa user_id
 *   TC-FUNC-057 — UPDATE com company_id errado não afeta funcionário de outra empresa
 *   TC-FUNC-074 — Revogação preserva cadastro (só zera user_id)
 *   TC-FUNC-076 — Soft delete: deleted_at, deleted_by, active=false, user_id=null + audit
 *   TC-FUNC-079 — Funcionário excluído libera vínculo da filial (temFuncionarioAtivo=false)
 *   TC-FUNC-081 — Persistência da exclusão (filtro deleted_at IS NULL)
 *   TC-FUNC-083 — Update em funcionário já excluído não retorna linhas
 *   TC-FUNC-085 — Caracteres especiais no nome
 *   TC-FUNC-086 — XSS no nome é armazenado como texto puro
 *
 * Casos NÃO cobertos aqui (requerem browser/UI ou Supabase Auth):
 *   TC-FUNC-001~006 (redirecionamento/rota), TC-FUNC-008, 010, 012~032,
 *   TC-FUNC-035~039, TC-FUNC-045~047, TC-FUNC-049 (Auth),
 *   TC-FUNC-054 (app_metadata.role), TC-FUNC-056, TC-FUNC-058~073 (Auth/convite/senha/revogar),
 *   TC-FUNC-075, TC-FUNC-077~078 (Auth), TC-FUNC-080, TC-FUNC-082, TC-FUNC-084, TC-FUNC-087~088.
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
let branchAInativa: string

let ownerIdB: string
let companyB: SeedCompany
let branchB1: string

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  ownerIdA = await createTestAuthUser('func-owner-a@assistencianet.test')
  companyA = await createTestCompany(ownerIdA, 'Empresa A — Funcionários Test')

  branchA1 = await criarFilial({ companyId: companyA.id, name: 'Filial A1 Ativa' })
  branchA2 = await criarFilial({ companyId: companyA.id, name: 'Filial A2 Ativa' })
  branchAInativa = await criarFilial({ companyId: companyA.id, name: 'Filial A3 Inativa', active: false })

  ownerIdB = await createTestAuthUser('func-owner-b@assistencianet.test')
  companyB = await createTestCompany(ownerIdB, 'Empresa B — Isolamento Func')
  branchB1 = await criarFilial({ companyId: companyB.id, name: 'Filial B1' })
})

afterAll(async () => {
  await cleanupCompany(companyA.id, ownerIdA)
  await cleanupCompany(companyB.id, ownerIdB)
})

// ─── Helpers locais ──────────────────────────────────────────────────────────

async function criarFilial(params: {
  companyId: string
  name: string
  active?: boolean
}): Promise<string> {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.branches (company_id, name, active)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [params.companyId, params.name, params.active ?? true],
    ),
  )
  return result.rows[0].id
}

type FuncionarioInput = {
  companyId: string
  branchId: string
  name: string
  role: 'admin' | 'atendente' | 'tecnico'
  email?: string | null
  phone?: string | null
  cpf?: string | null
  active?: boolean
  userId?: string | null
  laborRate?: number | null
}

async function criarFuncionario(params: FuncionarioInput): Promise<string> {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.employees
         (company_id, branch_id, name, role, email, phone, cpf, active, user_id, labor_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        params.companyId,
        params.branchId,
        params.name,
        params.role,
        params.email ?? null,
        params.phone ?? null,
        params.cpf ?? null,
        params.active ?? true,
        params.userId ?? null,
        params.laborRate ?? null,
      ],
    ),
  )
  return result.rows[0].id
}

async function listarFuncionarios(companyId: string) {
  const result = await withPg((pg) =>
    pg.query<{
      id: string
      name: string
      role: string
      active: boolean
      email: string | null
      user_id: string | null
      labor_rate: string | null
      deleted_at: Date | null
    }>(
      `SELECT id, name, role, active, email, user_id, labor_rate, deleted_at
       FROM public.employees
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [companyId],
    ),
  )
  return result.rows
}

async function listarFiliaisAtivas(companyId: string) {
  const result = await withPg((pg) =>
    pg.query<{ id: string; name: string }>(
      `SELECT id, name FROM public.branches
       WHERE company_id = $1 AND active = true AND deleted_at IS NULL
       ORDER BY name ASC`,
      [companyId],
    ),
  )
  return result.rows
}

async function softDeleteFuncionario(employeeId: string, deletedBy: string) {
  await withPg((pg) =>
    pg.query(
      `UPDATE public.employees
       SET deleted_at = now(), deleted_by = $2, active = false, user_id = NULL
       WHERE id = $1`,
      [employeeId, deletedBy],
    ),
  )
}

async function temFuncionarioAtivoNaFilial(companyId: string, branchId: string): Promise<boolean> {
  const result = await withPg((pg) =>
    pg.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM public.employees
       WHERE company_id = $1 AND branch_id = $2 AND active = true AND deleted_at IS NULL`,
      [companyId, branchId],
    ),
  )
  return parseInt(result.rows[0].count) > 0
}

async function registrarAudit(
  companyId: string,
  actorId: string,
  entityId: string,
  action: 'create' | 'update' | 'soft_delete' | 'revoke_access' | 'send_invite' | 'set_password',
  summary: string,
) {
  await withPg((pg) =>
    pg.query(
      `INSERT INTO public.audit_logs (company_id, actor_user_id, entity_type, entity_id, action, summary)
       VALUES ($1, $2, 'employee', $3, $4, $5)`,
      [companyId, actorId, entityId, action, summary],
    ),
  )
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('Módulo de Funcionários: Listagem', () => {
  it('TC-FUNC-007 — funcionários soft-deleted NÃO aparecem na listagem', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Para Excluir',
      role: 'atendente',
    })
    await softDeleteFuncionario(id, ownerIdA)

    const lista = await listarFuncionarios(companyA.id)
    expect(lista.find((f) => f.id === id)).toBeUndefined()
  })

  it('TC-FUNC-009 — funcionário com active=false tem flag correto no banco', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Inativo',
      role: 'atendente',
      active: false,
    })

    const result = await withPg((pg) =>
      pg.query<{ active: boolean }>('SELECT active FROM public.employees WHERE id = $1', [id]),
    )
    expect(result.rows[0].active).toBe(false)
  })

  it('TC-FUNC-011 — labor_rate é preenchido apenas para técnico', async () => {
    const tecnicoId = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Tec Com Taxa',
      role: 'tecnico',
      laborRate: 35.5,
    })
    const atendenteId = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Atendente Sem Taxa',
      role: 'atendente',
    })

    const result = await withPg((pg) =>
      pg.query<{ id: string; role: string; labor_rate: string | null }>(
        `SELECT id, role, labor_rate FROM public.employees WHERE id = ANY($1::uuid[])`,
        [[tecnicoId, atendenteId]],
      ),
    )
    const tec = result.rows.find((r) => r.id === tecnicoId)!
    const atd = result.rows.find((r) => r.id === atendenteId)!
    expect(tec.role).toBe('tecnico')
    expect(Number(tec.labor_rate)).toBe(35.5)
    expect(atd.labor_rate).toBeNull()
  })
})

describe('Módulo de Funcionários: Select de Filial', () => {
  it('TC-FUNC-033 — select de filial retorna somente filiais ativas e não excluídas', async () => {
    const filiais = await listarFiliaisAtivas(companyA.id)
    const ids = filiais.map((f) => f.id)

    expect(ids).toContain(branchA1)
    expect(ids).toContain(branchA2)
    expect(ids).not.toContain(branchAInativa)
  })
})

describe('Módulo de Funcionários: Constraints de Cadastro', () => {
  it('TC-FUNC-034 — role restrito a admin, atendente, tecnico (constraint CHECK)', async () => {
    await expect(
      criarFuncionario({
        companyId: companyA.id,
        branchId: branchA1,
        name: 'Func Role Invalido',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: 'gerente' as any,
      }),
    ).rejects.toThrow()
  })

  it('TC-FUNC-040 — labor_rate negativo é rejeitado pelo CHECK constraint', async () => {
    await expect(
      criarFuncionario({
        companyId: companyA.id,
        branchId: branchA1,
        name: 'Tec Taxa Negativa',
        role: 'tecnico',
        laborRate: -10,
      }),
    ).rejects.toThrow()
  })

  it('TC-FUNC-041 — labor_rate NULL é aceito (campo opcional)', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Tec Sem Taxa',
      role: 'tecnico',
      laborRate: null,
    })
    const result = await withPg((pg) =>
      pg.query<{ labor_rate: string | null }>(
        'SELECT labor_rate FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].labor_rate).toBeNull()
  })

  it('TC-FUNC-042 — labor_rate decimal é persistido corretamente', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Tec 49,90',
      role: 'tecnico',
      laborRate: 49.9,
    })
    const result = await withPg((pg) =>
      pg.query<{ labor_rate: string }>(
        'SELECT labor_rate FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    expect(Number(result.rows[0].labor_rate)).toBe(49.9)
  })
})

describe('Módulo de Funcionários: Cadastro', () => {
  it('TC-FUNC-043 — cadastro mínimo (nome + cargo + filial) + audit create', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Mínimo',
      role: 'atendente',
    })

    const result = await withPg((pg) =>
      pg.query<{ name: string; role: string; active: boolean; email: string | null }>(
        'SELECT name, role, active, email FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    const f = result.rows[0]
    expect(f.name).toBe('Func Mínimo')
    expect(f.role).toBe('atendente')
    expect(f.active).toBe(true)
    expect(f.email).toBeNull()

    await registrarAudit(companyA.id, ownerIdA, id, 'create', 'Funcionário "Func Mínimo" cadastrado')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'create'`,
        [id],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FUNC-044 — cadastro com todos os campos persiste corretamente', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA2,
      name: 'Func Completo',
      role: 'tecnico',
      email: 'completo@func.test',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-01',
      laborRate: 80.0,
    })

    const result = await withPg((pg) =>
      pg.query<{
        name: string
        role: string
        email: string
        phone: string
        cpf: string
        labor_rate: string
        branch_id: string
      }>(
        'SELECT name, role, email, phone, cpf, labor_rate, branch_id FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    const f = result.rows[0]
    expect(f.name).toBe('Func Completo')
    expect(f.role).toBe('tecnico')
    expect(f.email).toBe('completo@func.test')
    expect(f.phone).toBe('(11) 98765-4321')
    expect(f.cpf).toBe('123.456.789-01')
    expect(Number(f.labor_rate)).toBe(80)
    expect(f.branch_id).toBe(branchA2)
  })
})

describe('Módulo de Funcionários: Unicidade de E-mail', () => {
  it('TC-FUNC-048 — mesmo e-mail entre dois funcionários ativos é bloqueado pelo índice único', async () => {
    await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func E-mail 1',
      role: 'atendente',
      email: 'duplicado@func.test',
    })

    await expect(
      criarFuncionario({
        companyId: companyA.id,
        branchId: branchA1,
        name: 'Func E-mail 2',
        role: 'atendente',
        email: 'duplicado@func.test',
      }),
    ).rejects.toThrow()
  })

  it('TC-FUNC-050 — o índice único é case-insensitive (lower(email))', async () => {
    await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Case 1',
      role: 'atendente',
      email: 'case@func.test',
    })

    // Maiúsculas e minúsculas colidem no índice lower(email)
    await expect(
      criarFuncionario({
        companyId: companyA.id,
        branchId: branchA1,
        name: 'Func Case 2',
        role: 'atendente',
        email: 'CASE@func.test',
      }),
    ).rejects.toThrow()
  })

  it('TC-FUNC-051 — funcionário pode manter o próprio e-mail ao editar', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Mantem Email',
      role: 'atendente',
      email: 'mantem@func.test',
    })

    // UPDATE com o mesmo e-mail que já possui: deve passar (o índice filtra por deleted_at IS NULL
    // mas a linha a ser atualizada continua sendo a mesma).
    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET email = $2, phone = '99999-0000'
         WHERE id = $1 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [id, 'mantem@func.test', companyA.id],
      ),
    )
    expect(updateResult.rowCount).toBe(1)
  })

  it('TC-FUNC-052 — trocar e-mail para um já usado por outro funcionário ativo é bloqueado', async () => {
    await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Dono do Email',
      role: 'atendente',
      email: 'dono@func.test',
    })
    const outroId = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Outro Func',
      role: 'atendente',
      email: 'outro@func.test',
    })

    await expect(
      withPg((pg) =>
        pg.query(
          `UPDATE public.employees SET email = $2 WHERE id = $1`,
          [outroId, 'dono@func.test'],
        ),
      ),
    ).rejects.toThrow()
  })

  it('e-mail de funcionário soft-deleted libera o slot para reuso', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Pré-Delete',
      role: 'atendente',
      email: 'reuso@func.test',
    })
    await softDeleteFuncionario(id, ownerIdA)

    // Como o índice exige deleted_at IS NULL, o e-mail pode ser reusado
    const novoId = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Pós-Delete',
      role: 'atendente',
      email: 'reuso@func.test',
    })
    expect(novoId).toBeTruthy()
  })
})

describe('Módulo de Funcionários: Edição', () => {
  it('TC-FUNC-053 — edição básica atualiza dados + audit update', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Edição',
      role: 'atendente',
      phone: '(11) 1111-1111',
    })

    await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET role = $2, phone = $3, updated_at = now()
         WHERE id = $1 AND company_id = $4 AND deleted_at IS NULL`,
        [id, 'tecnico', '(11) 2222-2222', companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ role: string; phone: string }>(
        'SELECT role, phone FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].role).toBe('tecnico')
    expect(result.rows[0].phone).toBe('(11) 2222-2222')

    await registrarAudit(companyA.id, ownerIdA, id, 'update', 'Cargo alterado para técnico')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'update'`,
        [id],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FUNC-055 — desativar funcionário com acesso limpa user_id', async () => {
    const fakeUserId = await createTestAuthUser('func-acesso-a@assistencianet.test')

    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Com Acesso',
      role: 'admin',
      email: 'comacesso@func.test',
      userId: fakeUserId,
      active: true,
    })

    // Simula o que a Server Action faz ao desmarcar "ativo"
    await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET active = false, user_id = NULL
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ active: boolean; user_id: string | null }>(
        'SELECT active, user_id FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    expect(result.rows[0].active).toBe(false)
    expect(result.rows[0].user_id).toBeNull()

    // cleanup do fake auth user
    await withPg((pg) =>
      pg.query('DELETE FROM public.profiles WHERE id = $1', [fakeUserId]).then(() =>
        pg.query('DELETE FROM auth.users WHERE id = $1', [fakeUserId]),
      ),
    )
  })

  it('TC-FUNC-057 — UPDATE com company_id errado não afeta funcionário de outra empresa', async () => {
    const funcB = await criarFuncionario({
      companyId: companyB.id,
      branchId: branchB1,
      name: 'Func da Empresa B',
      role: 'atendente',
    })

    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET name = 'Hackeado'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [funcB, companyA.id], // company_id ERRADO
      ),
    )
    expect(updateResult.rowCount).toBe(0)

    const check = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.employees WHERE id = $1', [funcB]),
    )
    expect(check.rows[0].name).toBe('Func da Empresa B')
  })

  it('TC-FUNC-083 — UPDATE em funcionário já excluído (deleted_at IS NOT NULL) não afeta linhas', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Já Excluído',
      role: 'atendente',
    })
    await softDeleteFuncionario(id, ownerIdA)

    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET name = 'Tentativa de Editar'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyA.id],
      ),
    )
    expect(updateResult.rowCount).toBe(0)
  })
})

describe('Módulo de Funcionários: Revogação de Acesso', () => {
  it('TC-FUNC-074 — revogação preserva cadastro e apenas zera user_id', async () => {
    const fakeUserId = await createTestAuthUser('func-revogar-a@assistencianet.test')
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Revogar',
      role: 'atendente',
      email: 'revogar@func.test',
      userId: fakeUserId,
    })

    // Simula a Server Action de revogar acesso
    await withPg((pg) =>
      pg.query(
        `UPDATE public.employees SET user_id = NULL WHERE id = $1 AND company_id = $2`,
        [id, companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{
        name: string
        email: string
        user_id: string | null
        active: boolean
        deleted_at: Date | null
      }>(
        'SELECT name, email, user_id, active, deleted_at FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    const f = result.rows[0]
    expect(f.name).toBe('Func Revogar')
    expect(f.email).toBe('revogar@func.test')
    expect(f.user_id).toBeNull()
    expect(f.active).toBe(true)
    expect(f.deleted_at).toBeNull()

    await withPg((pg) =>
      pg.query('DELETE FROM public.profiles WHERE id = $1', [fakeUserId]).then(() =>
        pg.query('DELETE FROM auth.users WHERE id = $1', [fakeUserId]),
      ),
    )
  })
})

describe('Módulo de Funcionários: Exclusão (Soft Delete)', () => {
  it('TC-FUNC-076 — soft delete define deleted_at, deleted_by, active=false, user_id=null + audit', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Para Soft Delete',
      role: 'atendente',
    })
    await softDeleteFuncionario(id, ownerIdA)

    const result = await withPg((pg) =>
      pg.query<{
        deleted_at: Date | null
        deleted_by: string | null
        active: boolean
        user_id: string | null
      }>(
        'SELECT deleted_at, deleted_by, active, user_id FROM public.employees WHERE id = $1',
        [id],
      ),
    )
    const f = result.rows[0]
    expect(f.deleted_at).not.toBeNull()
    expect(f.deleted_by).toBe(ownerIdA)
    expect(f.active).toBe(false)
    expect(f.user_id).toBeNull()

    await registrarAudit(companyA.id, ownerIdA, id, 'soft_delete', 'Funcionário removido')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'soft_delete'`,
        [id],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FUNC-079 — funcionário excluído libera vínculo da filial', async () => {
    // Nova filial só para este teste
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Liberação' })
    const funcId = await criarFuncionario({
      companyId: companyA.id,
      branchId: filialId,
      name: 'Único Funcionário',
      role: 'atendente',
    })

    expect(await temFuncionarioAtivoNaFilial(companyA.id, filialId)).toBe(true)

    await softDeleteFuncionario(funcId, ownerIdA)

    expect(await temFuncionarioAtivoNaFilial(companyA.id, filialId)).toBe(false)
  })

  it('TC-FUNC-081 — persistência da exclusão: listagem não retorna após "reload"', async () => {
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Persist Delete',
      role: 'atendente',
    })
    await softDeleteFuncionario(id, ownerIdA)

    // Duas chamadas consecutivas simulando F5 / reload
    const lista1 = await listarFuncionarios(companyA.id)
    const lista2 = await listarFuncionarios(companyA.id)
    expect(lista1.find((f) => f.id === id)).toBeUndefined()
    expect(lista2.find((f) => f.id === id)).toBeUndefined()
  })
})

describe('Módulo de Funcionários: Casos de Borda', () => {
  it('TC-FUNC-085 — caracteres especiais no nome são persistidos sem erro', async () => {
    const nome = "José D'Ávila Júnior"
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: nome,
      role: 'tecnico',
    })
    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.employees WHERE id = $1', [id]),
    )
    expect(result.rows[0].name).toBe(nome)
  })

  it('TC-FUNC-086 — XSS no nome é armazenado como texto puro, sem execução', async () => {
    const nomeXSS = '<img src=x onerror=alert(1)>'
    const id = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: nomeXSS,
      role: 'atendente',
    })
    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.employees WHERE id = $1', [id]),
    )
    // Banco armazena como string pura — sanitização ocorre na camada UI
    expect(result.rows[0].name).toBe(nomeXSS)
  })
})

describe('Módulo de Funcionários: Isolamento Multi-Tenant', () => {
  it('listagem da empresa A não retorna funcionários da empresa B', async () => {
    const funcA = await criarFuncionario({
      companyId: companyA.id,
      branchId: branchA1,
      name: 'Func Exclusivo A',
      role: 'atendente',
    })
    const funcB = await criarFuncionario({
      companyId: companyB.id,
      branchId: branchB1,
      name: 'Func Exclusivo B',
      role: 'atendente',
    })

    const listaA = await listarFuncionarios(companyA.id)
    const ids = listaA.map((f) => f.id)
    expect(ids).toContain(funcA)
    expect(ids).not.toContain(funcB)
  })
})
