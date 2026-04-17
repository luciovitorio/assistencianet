import type { Tables } from '@/lib/supabase/database.types'

type CompanySettingsRow = Pick<
  Tables<'company_settings'>,
  'device_types' | 'default_warranty_days' | 'default_estimate_validity_days'
>

export interface ResolvedCompanySettings {
  deviceTypes: string[]
  defaultWarrantyDays: number
  defaultEstimateValidityDays: number
}

export const BEAUTY_SALON_DEVICE_TYPE_DEFAULTS = [
  'Secador',
  'Prancha',
  'Modelador',
  'Máquina de corte',
  'Autoclave',
  'Lâmpada UV/LED',
  'Vaporizador',
  'Outro equipamento',
] as const

export const COMPANY_SETTINGS_DEFAULTS: ResolvedCompanySettings = {
  deviceTypes: [...BEAUTY_SALON_DEVICE_TYPE_DEFAULTS],
  defaultWarrantyDays: 90,
  defaultEstimateValidityDays: 30,
}

const normalizeDeviceTypeLabel = (value: string) =>
  value.trim().replace(/\s+/g, ' ')

export const normalizeDeviceTypes = (deviceTypes: string[] | null | undefined): string[] => {
  const normalized = (deviceTypes ?? [])
    .map(normalizeDeviceTypeLabel)
    .filter(Boolean)

  const deduped: string[] = []
  const seen = new Set<string>()

  for (const deviceType of normalized) {
    const key = deviceType.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(deviceType)
  }

  return deduped.length > 0 ? deduped : [...COMPANY_SETTINGS_DEFAULTS.deviceTypes]
}

export const resolveCompanySettings = (
  settings: CompanySettingsRow | null | undefined,
): ResolvedCompanySettings => ({
  deviceTypes: normalizeDeviceTypes(settings?.device_types),
  defaultWarrantyDays:
    typeof settings?.default_warranty_days === 'number' &&
    Number.isFinite(settings.default_warranty_days) &&
    settings.default_warranty_days >= 0
      ? settings.default_warranty_days
      : COMPANY_SETTINGS_DEFAULTS.defaultWarrantyDays,
  defaultEstimateValidityDays:
    typeof settings?.default_estimate_validity_days === 'number' &&
    Number.isFinite(settings.default_estimate_validity_days) &&
    settings.default_estimate_validity_days >= 0
      ? settings.default_estimate_validity_days
      : COMPANY_SETTINGS_DEFAULTS.defaultEstimateValidityDays,
})

export const addDaysToDateInputValue = (days: number, baseDate = new Date()) => {
  const nextDate = new Date(baseDate)
  nextDate.setHours(12, 0, 0, 0)
  nextDate.setDate(nextDate.getDate() + days)

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
