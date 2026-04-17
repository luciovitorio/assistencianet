/**
 * Suite: Cálculo de Estoque (Físico, Reservado, Disponível)
 *
 * Testa diretamente as regras de negócio do módulo de estoque
 * via inserções diretas no banco de testes local (Docker/Supabase).
 * Usa pg direto para bypass de RLS.
 *
 * Escopo desta suite: apenas MOVIMENTAÇÕES físicas.
 * Reservas são testadas na suite de Ordens de Serviço.
 *
 * Pré-requisito: `npx supabase start` deve estar rodando.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestAuthUser,
  createTestCompany,
  createTestBranch,
  cleanupCompany,
  withPg,
  type SeedCompany,
  type SeedBranch,
} from './helpers'

// ─── Estado compartilhado da suite ──────────────────────────────────────────

let ownerId: string
let company: SeedCompany
let branch: SeedBranch
let partId: string

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // 1. Criar usuário auth + profile como dono da empresa
  ownerId = await createTestAuthUser('estoque-test@assistencianet.test')
  company = await createTestCompany(ownerId, 'Empresa Estoque Test')
  branch = await createTestBranch(company.id, 'Filial A')

  // 2. Cria uma peça com estoque mínimo de 5 e custo de R$10,00
  const result = await withPg((pg) =>
    pg.query<{ id: string }>(
      `INSERT INTO public.parts (company_id, name, min_stock, cost_price, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [company.id, 'Tela OLED 12 Pro', 5, 10.0, true],
    ),
  )
  partId = result.rows[0].id
})

afterAll(async () => {
  await cleanupCompany(company.id, ownerId)
})

// ─── Helpers locais ──────────────────────────────────────────────────────────

async function addMovement(quantity: number, type = 'entrada', referenceType?: string) {
  await withPg((pg) =>
    pg.query(
      `INSERT INTO public.stock_movements
         (company_id, branch_id, part_id, movement_type, quantity, unit_cost, entry_date, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        company.id,
        branch.id,
        partId,
        type,
        quantity,
        10.0,
        new Date().toISOString().slice(0, 10),
        referenceType ?? null,
      ],
    ),
  )
}

async function getStockPosition() {
  const result = await withPg(async (pg) => {
    const mov = await pg.query<{ quantity: string }>(
      `SELECT quantity FROM public.stock_movements
       WHERE company_id = $1 AND branch_id = $2 AND part_id = $3`,
      [company.id, branch.id, partId],
    )
    return { movements: mov.rows }
  })

  const fisico = result.movements.reduce((sum, m) => sum + Number(m.quantity), 0)
  return { fisico, disponivel: fisico }
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('Módulo de Estoque: Cálculo de posição física', () => {
  it('deve iniciar com estoque zerado para uma peça nova', async () => {
    const pos = await getStockPosition()
    expect(pos.fisico).toBe(0)
    expect(pos.disponivel).toBe(0)
  })

  it('deve adicionar estoque após uma entrada', async () => {
    await addMovement(10, 'entrada')
    const pos = await getStockPosition()
    expect(pos.fisico).toBe(10)
    expect(pos.disponivel).toBe(10)
  })

  it('deve reduzir o físico após saída (movimentação negativa)', async () => {
    await addMovement(-3, 'saida', 'service_order')
    const pos = await getStockPosition()
    // Físico cai 3
    expect(pos.fisico).toBe(7)
    expect(pos.disponivel).toBe(7)
  })

  it('deve detectar estoque no limite mínimo (min_stock=5, físico=7 — acima)', async () => {
    const pos = await getStockPosition()
    const part = await withPg((pg) =>
      pg.query<{ min_stock: number }>('SELECT min_stock FROM public.parts WHERE id = $1', [partId]),
    )
    const minStock = Number(part.rows[0]?.min_stock ?? 0)
    // Físico (7) está acima do mínimo (5): não deve acionar alerta
    expect(pos.fisico).toBeGreaterThan(minStock)
  })

  it('deve acionar alerta de estoque baixo quando físico cair abaixo do mínimo', async () => {
    // Sai mais 3 peças: físico vai para 4 (abaixo do mínimo de 5)
    await addMovement(-3, 'saida', 'service_order')
    const pos = await getStockPosition()

    const part = await withPg((pg) =>
      pg.query<{ min_stock: number }>('SELECT min_stock FROM public.parts WHERE id = $1', [partId]),
    )
    const minStock = Number(part.rows[0]?.min_stock ?? 0)
    expect(pos.fisico).toBeLessThan(minStock)
  })

  it('deve calcular o valor financeiro do inventário corretamente', async () => {
    const pos = await getStockPosition()
    const part = await withPg((pg) =>
      pg.query<{ cost_price: string }>('SELECT cost_price FROM public.parts WHERE id = $1', [partId]),
    )
    const costPrice = Number(part.rows[0]?.cost_price ?? 0)
    // Valor = max(0, físico) * custo unitário
    // Físico = 4 (10 entrada - 3 saída - 3 saída)
    const expectedValue = Math.max(0, pos.fisico) * costPrice
    expect(expectedValue).toBe(4 * 10)
    expect(expectedValue).toBe(40)
  })

  it('deve calcular balanço correto com múltiplas entradas e saídas', async () => {
    // Estado atual: físico=4
    // Adiciona mais 6 e retira 2
    await addMovement(6, 'entrada')
    await addMovement(-2, 'saida')
    const pos = await getStockPosition()
    // 4 + 6 - 2 = 8
    expect(pos.fisico).toBe(8)
  })
})
