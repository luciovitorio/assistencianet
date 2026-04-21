import { cookies } from 'next/headers'

const TABLE_COLUMN_COOKIE_PREFIX = 'table-col:'
const TABLE_COLUMN_COOKIE_VERSION = 'v1'

export const tableColumnCookieName = (tableKey: string) =>
  `${TABLE_COLUMN_COOKIE_PREFIX}${tableKey}:${TABLE_COLUMN_COOKIE_VERSION}`

export async function getTableColumnsVisibility(
  tableKey: string,
): Promise<Record<string, boolean> | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(tableColumnCookieName(tableKey))?.value
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, boolean> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'boolean') {
          result[key] = value
        }
      }
      return result
    }
  } catch {
    // Ignore malformed cookie.
  }

  return null
}
