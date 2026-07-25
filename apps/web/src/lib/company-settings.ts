import type { Tables } from '@/lib/supabase/database.types'

type CompanySettingsRow = Pick<
  Tables<'company_settings'>,
  'default_warranty_days' | 'default_estimate_validity_days' | 'os_print_disclaimer'
>

export interface ResolvedCompanySettings {
  defaultWarrantyDays: number
  defaultEstimateValidityDays: number
  osPrintDisclaimer: string | null
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
  defaultWarrantyDays: 90,
  defaultEstimateValidityDays: 30,
  osPrintDisclaimer: null,
}

export const resolveCompanySettings = (
  settings: CompanySettingsRow | null | undefined,
): ResolvedCompanySettings => ({
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
  osPrintDisclaimer:
    typeof settings?.os_print_disclaimer === 'string' && settings.os_print_disclaimer.trim()
      ? settings.os_print_disclaimer.trim()
      : COMPANY_SETTINGS_DEFAULTS.osPrintDisclaimer,
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
