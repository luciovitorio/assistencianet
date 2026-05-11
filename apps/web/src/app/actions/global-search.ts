'use server'

import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'

const sanitize = (value: string) =>
  value.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)

export type GlobalSearchServiceOrder = {
  id: string
  number: number
  status: string
  device_type: string | null
  device_brand: string | null
  device_model: string | null
  client_name: string | null
}

export type GlobalSearchClient = {
  id: string
  name: string
  phone: string | null
  document: string | null
}

export type GlobalSearchPart = {
  id: string
  name: string
  category: string | null
}

export type GlobalSearchService = {
  id: string
  name: string
  category: string | null
}

export type GlobalSearchResults = {
  serviceOrders: GlobalSearchServiceOrder[]
  clients: GlobalSearchClient[]
  parts: GlobalSearchPart[]
  services: GlobalSearchService[]
}

export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const empty: GlobalSearchResults = { serviceOrders: [], clients: [], parts: [], services: [] }

  try {
    const term = sanitize(query)
    if (!term) return empty

    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    const numericTerm = term.replace(/\D/g, '')
    const isNumeric = numericTerm.length > 0 && /^\d+$/.test(term.replace(/\s/g, ''))

    const [osResult, clientsResult, partsResult, servicesResult] = await Promise.all([
      // Service orders: search by number (if numeric) or client name
      supabase
        .from('service_orders')
        .select('id, number, status, device_type, device_brand, device_model, clients(name)')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .or(
          isNumeric
            ? `number.eq.${numericTerm}`
            : `clients.name.ilike.${term}%,clients.name.ilike.% ${term}%,device_brand.ilike.${term}%,device_model.ilike.${term}%`
        )
        .order('number', { ascending: false })
        .limit(5),

      // Clients: single RPC handles name + phone + document patterns, DB deduplicates
      supabase.rpc('search_clients_global', {
        p_company_id: companyId,
        p_term:       term,
        p_numeric:    numericTerm,
        p_lim:        20,
      }),

      // Parts: search by name
      supabase
        .from('parts')
        .select('id, name, category')
        .eq('company_id', companyId)
        .eq('active', true)
        .or(`name.ilike.${term}%,name.ilike.% ${term}%`)
        .order('name')
        .limit(5),

      // Services: search by name
      supabase
        .from('services')
        .select('id, name, category')
        .eq('company_id', companyId)
        .eq('active', true)
        .or(`name.ilike.${term}%,name.ilike.% ${term}%`)
        .order('name')
        .limit(5),
    ])

    const serviceOrders = (osResult.data ?? []).map((os) => ({
      id: os.id,
      number: os.number,
      status: os.status,
      device_type: os.device_type,
      device_brand: os.device_brand,
      device_model: os.device_model,
      client_name: Array.isArray(os.clients)
        ? (os.clients[0]?.name ?? null)
        : ((os.clients as { name: string } | null)?.name ?? null),
    }))

    return {
      serviceOrders,
      clients: clientsResult.data ?? [],
      parts: partsResult.data ?? [],
      services: servicesResult.data ?? [],
    }
  } catch {
    return empty
  }
}
