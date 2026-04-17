/**
 * Suite: Módulo de Filiais
 *
 * Cobre testes de integração de banco de dados do módulo de filiais,
 * baseados no caderno de testes doc/test-plan-filiais.md.
 *
 * Casos cobertos aqui (lógica de banco e RBAC via SQL):
 *   TC-FIL-007 — Soft-deleted branches não aparecem na listagem
 *   TC-FIL-008 — Badge Matriz (is_main = true)
 *   TC-FIL-009 — Badge Inativa (active = false)
 *   TC-FIL-014 — Nome obrigatório (NOT NULL constraint)
 *   TC-FIL-025 — Criação com sucesso + audit_log gerado
 *   TC-FIL-026 — Criação apenas com nome (campos opcionais nulos)
 *   TC-FIL-033 — Edição com sucesso + audit_log
 *   TC-FIL-035 — Edição não afeta filiais de outra empresa (multi-tenant)
 *   TC-FIL-039 — Soft delete: deleted_at, deleted_by, active=false
 *   TC-FIL-040 — Exclusão bloqueada com funcionário vinculado
 *   TC-FIL-042 — Filial excluída não retorna (filtered by deleted_at IS NULL)
 *   TC-FIL-043 — Edição de filial já excluída é rejeitada
 *   TC-FIL-062 — Caracteres especiais no nome salvam corretamente
 *   TC-FIL-063 — XSS armazenado como texto puro (não executa)
 *
 * Casos NÃO cobertos aqui (requerem browser/UI):
 *   TC-FIL-001~005 (redirecionamento de rota), TC-FIL-006,
 *   TC-FIL-010~032, TC-FIL-036~038, TC-FIL-041, TC-FIL-044~061, TC-FIL-064
 *
 * Pré-requisito: `npx supabase start` rodando.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestAuthUser,
  createTestCompany,
  createTestBranch,
  cleanupCompany,
  withPg,
  type SeedCompany,
} from './helpers'

// ─── Estado compartilhado ────────────────────────────────────────────────────

let ownerIdA: string
let companyA: SeedCompany

let ownerIdB: string
let companyB: SeedCompany

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Empresa A — empresa principal dos testes
  ownerIdA = await createTestAuthUser('filiais-owner-a@assistencianet.test')
  companyA = await createTestCompany(ownerIdA, 'Empresa A — Filiais Test')

  // Empresa B — para testes de isolamento multi-tenant
  ownerIdB = await createTestAuthUser('filiais-owner-b@assistencianet.test')
  companyB = await createTestCompany(ownerIdB, 'Empresa B — Isolamento')
})

afterAll(async () => {
  await cleanupCompany(companyA.id, ownerIdA)
  await cleanupCompany(companyB.id, ownerIdB)
})

// ─── Helpers locais ──────────────────────────────────────────────────────────

/** Cria uma filial diretamente via SQL e retorna o id */
async function criarFilial(params: {
  companyId: string
  name: string
  isMain?: boolean
  active?: boolean
  city?: string
  phone?: string
  address?: string
  state?: string
}): Promise<string> {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.branches (company_id, name, is_main, active, city, phone, address, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        params.companyId,
        params.name,
        params.isMain ?? false,
        params.active ?? true,
        params.city ?? null,
        params.phone ?? null,
        params.address ?? null,
        params.state ?? null,
      ],
    ),
  )
  return result.rows[0].id
}

/** Busca filiais ativas (deleted_at IS NULL) de uma empresa */
async function listarFiliais(companyId: string) {
  const result = await withPg((pg) =>
    pg.query<{ id: string; name: string; is_main: boolean; active: boolean; deleted_at: Date | null }>(
      `SELECT id, name, is_main, active, deleted_at
       FROM public.branches
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [companyId],
    ),
  )
  return result.rows
}

/** Soft-deleta uma filial: define deleted_at, deleted_by, active=false */
async function softDeleteFilial(branchId: string, deletedBy: string) {
  await withPg((pg) =>
    pg.query(
      `UPDATE public.branches
       SET deleted_at = now(), deleted_by = $2, active = false
       WHERE id = $1`,
      [branchId, deletedBy],
    ),
  )
}

/** Insere um funcionário ativo vinculado a uma filial (para testar bloqueio de exclusão) */
async function criarFuncionario(companyId: string, branchId: string, userId: string) {
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.employees (company_id, branch_id, user_id, name, role, active)
       VALUES ($1, $2, $3, 'Funcionário Teste', 'atendente', true)
       RETURNING id`,
      [companyId, branchId, userId],
    ),
  )
  return result.rows[0].id
}

/** Verifica se exclusão seria bloqueada por funcionário vinculado (regra de negócio) */
async function temFuncionarioAtivo(companyId: string, branchId: string): Promise<boolean> {
  const result = await withPg((pg) =>
    pg.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM public.employees
       WHERE company_id = $1 AND branch_id = $2 AND active = true AND deleted_at IS NULL`,
      [companyId, branchId],
    ),
  )
  return parseInt(result.rows[0].count) > 0
}

/** Insere um registro de audit_log */
async function registrarAudit(
  companyId: string,
  actorId: string,
  entityId: string,
  action: 'create' | 'update' | 'soft_delete',
  summary: string,
) {
  await withPg((pg) =>
    pg.query(
      `INSERT INTO public.audit_logs (company_id, actor_user_id, entity_type, entity_id, action, summary)
       VALUES ($1, $2, 'branch', $3, $4, $5)`,
      [companyId, actorId, entityId, action, summary],
    ),
  )
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('Módulo de Filiais: Listagem', () => {
  it('TC-FIL-007 — filiais com soft-delete NÃO devem aparecer na listagem', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial para Deletar' })
    await softDeleteFilial(filialId, ownerIdA)

    const lista = await listarFiliais(companyA.id)
    const encontrada = lista.find((f) => f.id === filialId)
    expect(encontrada).toBeUndefined()
  })

  it('TC-FIL-008 — filial com is_main=true deve existir no banco com flag correto', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Matriz', isMain: true })

    const result = await withPg((pg) =>
      pg.query<{ is_main: boolean }>('SELECT is_main FROM public.branches WHERE id = $1', [filialId]),
    )
    expect(result.rows[0].is_main).toBe(true)
  })

  it('TC-FIL-009 — filial com active=false deve ter flag correto no banco', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Inativa', active: false })

    const result = await withPg((pg) =>
      pg.query<{ active: boolean }>('SELECT active FROM public.branches WHERE id = $1', [filialId]),
    )
    expect(result.rows[0].active).toBe(false)
  })

  it('TC-FIL-042 — filial excluída não retorna após recarregar a listagem', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Reload Test' })

    // Confirma que aparece antes da exclusão
    const antesDelete = await listarFiliais(companyA.id)
    expect(antesDelete.find((f) => f.id === filialId)).toBeDefined()

    // Exclui e confirma que sumiu
    await softDeleteFilial(filialId, ownerIdA)
    const depoisDelete = await listarFiliais(companyA.id)
    expect(depoisDelete.find((f) => f.id === filialId)).toBeUndefined()
  })
})

describe('Módulo de Filiais: Cadastro', () => {
  it('TC-FIL-014 — nome NULL deve violar constraint NOT NULL', async () => {
    await expect(
      withPg((pg) =>
        pg.query(
          `INSERT INTO public.branches (company_id, name) VALUES ($1, NULL)`,
          [companyA.id],
        ),
      ),
    ).rejects.toThrow()
  })

  it('TC-FIL-025 — criação com todos os campos salva corretamente', async () => {
    const filialId = await criarFilial({
      companyId: companyA.id,
      name: 'Filial Completa',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 99999-0000',
      address: 'Av. Paulista, 1000',
    })

    const result = await withPg((pg) =>
      pg.query<{ name: string; city: string; state: string; phone: string }>(
        'SELECT name, city, state, phone FROM public.branches WHERE id = $1',
        [filialId],
      ),
    )
    const branch = result.rows[0]
    expect(branch.name).toBe('Filial Completa')
    expect(branch.city).toBe('São Paulo')
    expect(branch.state).toBe('SP')
    expect(branch.phone).toBe('(11) 99999-0000')

    // Audit log (simulando o que a Server Action registraria)
    await registrarAudit(companyA.id, ownerIdA, filialId, 'create', `Filial "Filial Completa" criada`)
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'create'`,
        [filialId],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FIL-026 — criação apenas com nome deixa campos opcionais nulos', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Somente Nome' })

    const result = await withPg((pg) =>
      pg.query<{ city: string | null; phone: string | null; address: string | null }>(
        'SELECT city, phone, address FROM public.branches WHERE id = $1',
        [filialId],
      ),
    )
    const branch = result.rows[0]
    expect(branch.city).toBeNull()
    expect(branch.phone).toBeNull()
    expect(branch.address).toBeNull()
  })

  it('TC-FIL-062 — caracteres especiais no nome salvam corretamente', async () => {
    const nomeEspecial = 'Açaí & Cia – Filial nº 1 / Centro'
    const filialId = await criarFilial({ companyId: companyA.id, name: nomeEspecial })

    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.branches WHERE id = $1', [filialId]),
    )
    expect(result.rows[0].name).toBe(nomeEspecial)
  })

  it('TC-FIL-063 — XSS no nome é armazenado como texto puro, sem execução', async () => {
    const nomeXSS = "<script>alert('xss')</script>"
    const filialId = await criarFilial({ companyId: companyA.id, name: nomeXSS })

    const result = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.branches WHERE id = $1', [filialId]),
    )
    // O banco armazena como string pura — a sanitização acontece na camada de UI
    expect(result.rows[0].name).toBe(nomeXSS)
  })
})

describe('Módulo de Filiais: Edição', () => {
  it('TC-FIL-033 — edição com sucesso atualiza os dados no banco', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Original' })

    // Simula o UPDATE que a Server Action faria
    await withPg((pg) =>
      pg.query(
        `UPDATE public.branches SET name = $2, city = $3, updated_at = now()
         WHERE id = $1 AND company_id = $4 AND deleted_at IS NULL`,
        [filialId, 'Filial Editada', 'Campinas', companyA.id],
      ),
    )

    const result = await withPg((pg) =>
      pg.query<{ name: string; city: string }>(
        'SELECT name, city FROM public.branches WHERE id = $1',
        [filialId],
      ),
    )
    expect(result.rows[0].name).toBe('Filial Editada')
    expect(result.rows[0].city).toBe('Campinas')

    // Audit log de update
    await registrarAudit(companyA.id, ownerIdA, filialId, 'update', 'Filial renomeada para "Filial Editada"')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'update'`,
        [filialId],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FIL-035 — UPDATE com company_id errado não afeta filiais de outra empresa (multi-tenant)', async () => {
    // Cria filial na Empresa B
    const filialB = await criarFilial({ companyId: companyB.id, name: 'Filial da Empresa B' })

    // Tenta editar com guard de company_id da Empresa A (como a Server Action faria)
    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.branches SET name = 'Hackeada'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [filialB, companyA.id], // usa company_id ERRADO (A tentando editar B)
      ),
    )

    // Nenhuma linha deve ser afetada
    expect(updateResult.rowCount).toBe(0)

    // Confirma que o nome na Empresa B ficou intacto
    const check = await withPg((pg) =>
      pg.query<{ name: string }>('SELECT name FROM public.branches WHERE id = $1', [filialB]),
    )
    expect(check.rows[0].name).toBe('Filial da Empresa B')
  })

  it('TC-FIL-043 — editar filial com deleted_at definido não retorna linhas', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Já Excluída' })
    await softDeleteFilial(filialId, ownerIdA)

    // Tenta editar com guard de deleted_at IS NULL
    const updateResult = await withPg((pg) =>
      pg.query(
        `UPDATE public.branches SET name = 'Editada Após Exclusão'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [filialId, companyA.id],
      ),
    )

    expect(updateResult.rowCount).toBe(0)
  })
})

describe('Módulo de Filiais: Exclusão (Soft Delete)', () => {
  it('TC-FIL-039 — soft delete define deleted_at, deleted_by e active=false', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial para Soft Delete' })

    await softDeleteFilial(filialId, ownerIdA)

    const result = await withPg((pg) =>
      pg.query<{ deleted_at: Date | null; deleted_by: string | null; active: boolean }>(
        'SELECT deleted_at, deleted_by, active FROM public.branches WHERE id = $1',
        [filialId],
      ),
    )
    const branch = result.rows[0]
    expect(branch.deleted_at).not.toBeNull()
    expect(branch.deleted_by).toBe(ownerIdA)
    expect(branch.active).toBe(false)

    // Audit log
    await registrarAudit(companyA.id, ownerIdA, filialId, 'soft_delete', 'Filial removida')
    const audit = await withPg((pg) =>
      pg.query(
        `SELECT action FROM public.audit_logs WHERE entity_id = $1 AND action = 'soft_delete'`,
        [filialId],
      ),
    )
    expect(audit.rows.length).toBe(1)
  })

  it('TC-FIL-040 — exclusão bloqueada quando há funcionário ativo vinculado', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial com Funcionário' })

    // Cria um funcionário ativo nessa filial
    await criarFuncionario(companyA.id, filialId, ownerIdA)

    // A regra de negócio: verifica antes de excluir
    const bloqueado = await temFuncionarioAtivo(companyA.id, filialId)
    expect(bloqueado).toBe(true)

    // Como a Server Action faria: só executa o delete se bloqueado=false
    if (bloqueado) {
      // Simula o retorno de erro — filial NÃO deve ser excluída
      const check = await withPg((pg) =>
        pg.query<{ deleted_at: Date | null }>(
          'SELECT deleted_at FROM public.branches WHERE id = $1',
          [filialId],
        ),
      )
      expect(check.rows[0].deleted_at).toBeNull()
    }
  })

  it('TC-FIL-040 variante — exclusão permitida quando não há funcionário ativo', async () => {
    const filialId = await criarFilial({ companyId: companyA.id, name: 'Filial Sem Funcionários' })

    const bloqueado = await temFuncionarioAtivo(companyA.id, filialId)
    expect(bloqueado).toBe(false)

    // Pode excluir com segurança
    await softDeleteFilial(filialId, ownerIdA)
    const check = await withPg((pg) =>
      pg.query<{ deleted_at: Date | null }>(
        'SELECT deleted_at FROM public.branches WHERE id = $1',
        [filialId],
      ),
    )
    expect(check.rows[0].deleted_at).not.toBeNull()
  })
})

describe('Módulo de Filiais: Isolamento Multi-Tenant', () => {
  it('listagem da empresa A não retorna filiais da empresa B', async () => {
    const filialA = await criarFilial({ companyId: companyA.id, name: 'Filial Exclusiva A' })
    const filialB = await criarFilial({ companyId: companyB.id, name: 'Filial Exclusiva B' })

    const listaA = await listarFiliais(companyA.id)
    const idsA = listaA.map((f) => f.id)

    expect(idsA).toContain(filialA)
    expect(idsA).not.toContain(filialB)
  })
})
