import * as z from 'zod'

export const branchSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome da filial é obrigatório')
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

export type BranchSchema = z.infer<typeof branchSchema>
