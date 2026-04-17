import { z } from 'zod'

export const empresaSchema = z.object({
  name: z.string().min(2, 'Nome da empresa obrigatório'),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v), {
      message: 'CNPJ inválido (ex: 00.000.000/0000-00)',
    }),
  segment: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
})

// branchSchema used for action-side validation (address is the combined street+number+complement)
export const branchSchema = z.object({
  name: z.string().min(2, 'Nome da filial obrigatório'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  phone: z.string().optional(),
})

// branchFormSchema used for client-side form with split address fields
export const branchFormSchema = z.object({
  name: z.string().min(2, 'Nome da filial obrigatório'),
  zip_code: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
})

export const filiaisSchema = z.object({
  branches: z.array(branchSchema).min(1, 'Adicione ao menos uma filial'),
})

export type EmpresaSchema = z.infer<typeof empresaSchema>
export type BranchSchema = z.infer<typeof branchSchema>
export type BranchFormSchema = z.infer<typeof branchFormSchema>
export type FiliaisSchema = z.infer<typeof filiaisSchema>

export type FiliaisFormSchema = {
  branches: BranchFormSchema[]
}
