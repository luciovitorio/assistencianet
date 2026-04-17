import * as z from 'zod'

export const companySettingsSchema = z.object({
  device_types: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Informe um tipo de equipamento válido.')
        .max(100, 'O tipo de equipamento deve ter no máximo 100 caracteres.'),
    )
    .min(1, 'Selecione pelo menos um tipo de equipamento.'),
  default_warranty_days: z
    .number({ error: 'Informe o prazo default de garantia.' })
    .int('O prazo default de garantia deve ser inteiro.')
    .min(0, 'O prazo default de garantia nao pode ser negativo.')
    .max(3650, 'O prazo default de garantia deve ser de no maximo 3650 dias.'),
  default_estimate_validity_days: z
    .number({ error: 'Informe a validade default do orcamento.' })
    .int('A validade default do orcamento deve ser inteira.')
    .min(0, 'A validade default do orcamento nao pode ser negativa.')
    .max(3650, 'A validade default do orcamento deve ser de no maximo 3650 dias.'),
})

export type CompanySettingsSchema = z.input<typeof companySettingsSchema>
export type CompanySettingsValues = z.output<typeof companySettingsSchema>
