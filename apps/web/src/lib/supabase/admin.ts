import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Cliente Supabase com service role key — uso exclusivo em Server Actions.
 * Nunca expor ao cliente.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
