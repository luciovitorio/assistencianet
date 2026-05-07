'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/auth/admin-context'
import { assertBillingFeature } from '@/lib/billing/entitlements'
import { createClient } from '@/lib/supabase/server'
import {
  botMenuItemSchema,
  type BotMenuItemSchema,
} from '@/lib/validations/bot-menu-item'

const REVALIDATE = () => revalidatePath('/dashboard/configuracoes/bot')

async function getBotContext() {
  const { companyId } = await getAdminContext('configuracoes')
  const supabase = await createClient()
  await assertBillingFeature(supabase, companyId, 'whatsapp_bot')
  return { companyId, supabase }
}

// ── Tipos retornados ─────────────────────────────────────────

export type BotMenuItemRow = {
  id: string
  parent_id: string | null
  position: number
  label: string
  emoji: string | null
  handler_type: string
  handler_config: Record<string, unknown>
  enabled: boolean
}

export type BotMenuItemWithChildren = BotMenuItemRow & {
  children: BotMenuItemRow[]
}

// Campos extra que ainda não existem nos tipos gerados (parent_id é novo)
type MenuItemInsert = {
  company_id: string
  parent_id: string | null
  position: number
  label: string
  emoji: string | null
  handler_type: string
  handler_config: unknown
  enabled: boolean
}

type MenuItemUpdate = Partial<Omit<MenuItemInsert, 'company_id'>>

// ── Leitura ──────────────────────────────────────────────────

/** Retorna todos os itens raiz com seus filhos diretos. */
export async function getBotMenuItems(): Promise<
  { data: BotMenuItemWithChildren[] } | { error: string }
> {
  try {
    const { companyId, supabase } = await getBotContext()

    const { data, error } = await supabase
      .from('whatsapp_menu_items')
      .select('id, parent_id, position, label, emoji, handler_type, handler_config, enabled')
      .eq('company_id', companyId)
      .order('position')

    if (error) throw error

    const rows = (data as unknown as BotMenuItemRow[]) ?? []
    const roots = rows.filter((r) => r.parent_id === null)
    const childrenMap = new Map<string, BotMenuItemRow[]>()

    for (const row of rows) {
      if (row.parent_id) {
        const list = childrenMap.get(row.parent_id) ?? []
        list.push(row)
        childrenMap.set(row.parent_id, list)
      }
    }

    const result: BotMenuItemWithChildren[] = roots.map((r) => ({
      ...r,
      children: childrenMap.get(r.id) ?? [],
    }))

    return { data: result }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar menu' }
  }
}

// ── Criação ──────────────────────────────────────────────────

export async function createBotMenuItem(
  input: BotMenuItemSchema,
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()
    const parsed = botMenuItemSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const row: MenuItemInsert = { ...parsed.data, company_id: companyId }

    const { data, error } = await supabase
      .from('whatsapp_menu_items')
      .insert(row as unknown as Parameters<ReturnType<typeof supabase.from>['insert']>[0])
      .select('id')
      .single()

    if (error) throw error

    REVALIDATE()
    return { success: true, id: (data as { id: string }).id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar item' }
  }
}

// ── Edição ───────────────────────────────────────────────────

export async function updateBotMenuItem(
  id: string,
  input: BotMenuItemSchema,
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()
    const parsed = botMenuItemSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const update: MenuItemUpdate = parsed.data

    const { error } = await supabase
      .from('whatsapp_menu_items')
      .update(update as unknown as Parameters<ReturnType<typeof supabase.from>['update']>[0])
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    REVALIDATE()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar item' }
  }
}

// ── Toggle enabled ───────────────────────────────────────────

export async function toggleBotMenuItem(
  id: string,
  enabled: boolean,
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()

    const { error } = await supabase
      .from('whatsapp_menu_items')
      .update({ enabled })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    REVALIDATE()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar item' }
  }
}

// ── Exclusão ─────────────────────────────────────────────────

export async function deleteBotMenuItem(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()

    // ON DELETE CASCADE cuida dos filhos automaticamente
    const { error } = await supabase
      .from('whatsapp_menu_items')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    REVALIDATE()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir item' }
  }
}

// ── Reordenação ──────────────────────────────────────────────

/**
 * Recebe a lista de ids na nova ordem e atribui positions 1..N.
 * Todos os ids devem pertencer ao mesmo parent_id e à mesma empresa.
 */
export async function reorderBotMenuItems(
  ids: string[],
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()
    if (ids.length === 0) return { success: true }

    // Passo 1: mover para posições temporárias altas para evitar conflito de unique constraint
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from('whatsapp_menu_items')
        .update({ position: 10000 + i })
        .eq('id', ids[i])
        .eq('company_id', companyId)
      if (error) throw new Error(error.message)
    }

    // Passo 2: atribuir posições finais
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from('whatsapp_menu_items')
        .update({ position: i + 1 })
        .eq('id', ids[i])
        .eq('company_id', companyId)
      if (error) throw new Error(error.message)
    }

    REVALIDATE()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reordenar itens' }
  }
}
