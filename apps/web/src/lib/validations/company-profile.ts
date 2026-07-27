import type { z } from 'zod'
import { empresaSchema } from '@/lib/validations/onboarding'

export const companyProfileSchema = empresaSchema.omit({ owner_operates: true })

export type CompanyProfileSchema = z.input<typeof companyProfileSchema>
