import '@testing-library/jest-dom'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service_role para os testes.
 * Permite inserir/limpar dados sem restrição de RLS.
 */
export const testClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)
