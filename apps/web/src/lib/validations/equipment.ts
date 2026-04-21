import * as z from 'zod'

export const EQUIPMENT_VOLTAGES = ['110V', '127V', '220V', 'Bivolt', 'Outro'] as const
export type EquipmentVoltage = (typeof EQUIPMENT_VOLTAGES)[number]

export const equipmentSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, 'Tipo é obrigatório')
    .max(100, 'Tipo deve ter no máximo 100 caracteres'),
  manufacturer: z
    .string()
    .trim()
    .min(1, 'Fabricante é obrigatório')
    .max(100, 'Fabricante deve ter no máximo 100 caracteres'),
  model: z
    .string()
    .trim()
    .min(1, 'Modelo é obrigatório')
    .max(150, 'Modelo deve ter no máximo 150 caracteres'),
  voltage: z
    .string()
    .trim()
    .max(50, 'Voltagem deve ter no máximo 50 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  active: z.boolean().default(true),
})

export type EquipmentSchema = z.input<typeof equipmentSchema>
export type EquipmentValues = z.output<typeof equipmentSchema>
