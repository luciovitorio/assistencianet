'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  partSchema,
  PART_CATEGORIES,
  CATEGORY_LABELS,
  PART_UNITS,
  UNIT_LABELS,
  type PartSchema,
  type PartCategory,
  type PartUnit,
} from '@/lib/validations/part'
import { createPart, updatePart } from '@/app/actions/parts'

export interface PartFormState {
  id?: string
  name?: string
  sku?: string | null
  category?: string
  unit?: string
  supplier_id?: string | null
  cost_price?: number | null
  sale_price?: number | null
  min_stock?: number
  notes?: string | null
  active?: boolean
}

interface SupplierOption {
  id: string
  name: string
}

interface PartDialogProps {
  part?: PartFormState
  suppliers: SupplierOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PartFormValues = Omit<PartSchema, 'cost_price' | 'sale_price' | 'min_stock'> & {
  cost_price?: string | number
  sale_price?: string | number
  min_stock: string | number
}

export function PartDialog({ part, suppliers, open, onOpenChange }: PartDialogProps) {
  const isEditing = !!part?.id
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema) as unknown as Resolver<PartFormValues>,
    defaultValues: {
      name: '',
      sku: '',
      category: 'peca_reposicao',
      unit: 'unidade',
      supplier_id: '',
      cost_price: '',
      sale_price: '',
      min_stock: 0,
      notes: '',
      active: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: part?.name || '',
        sku: part?.sku || '',
        category: (part?.category as PartCategory) || 'peca_reposicao',
        unit: (part?.unit as PartUnit) || 'unidade',
        supplier_id: part?.supplier_id || '',
        cost_price: part?.cost_price != null ? String(Math.round(part.cost_price * 100)) : '',
        sale_price: part?.sale_price != null ? String(Math.round(part.sale_price * 100)) : '',
        min_stock: part?.min_stock ?? 0,
        notes: part?.notes || '',
        active: part?.active !== false,
      })
    }
  }, [open, part, reset])

  const onSubmit = (data: PartFormValues) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updatePart(part!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Peça atualizada com sucesso.')
        } else {
          const result = await createPart(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Peça cadastrada com sucesso.')
        }
        router.refresh()
        onOpenChange(false)
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Ocorreu um erro ao salvar a peça.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            {isEditing ? 'Editar Peça' : 'Nova Peça'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da peça. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar uma nova peça no catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="part-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nome */}
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome da peça *"
                    placeholder="Ex: Motor ventilador, Resistência 1800W"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            {/* SKU */}
            <Controller
              control={control}
              name="sku"
              render={({ field }) => (
                <InputField
                  label="SKU / Código"
                  placeholder="Ex: MOT-001"
                  error={errors.sku?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            {/* Categoria */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Categoria *</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as PartCategory)}
                  >
                    <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {field.value
                          ? CATEGORY_LABELS[field.value as PartCategory]
                          : 'Selecione a categoria'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {PART_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-destructive text-xs mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Unidade */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Unidade *</Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as PartUnit)}>
                    <SelectTrigger className={errors.unit ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {field.value ? UNIT_LABELS[field.value as PartUnit] : 'Selecione a unidade'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {PART_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {UNIT_LABELS[unit]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unit && (
                <p className="text-destructive text-xs mt-1">{errors.unit.message}</p>
              )}
            </div>

            {/* Fornecedor padrão */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Fornecedor padrão</Label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => {
                  const selectedId = field.value ?? ''
                  const selectedName = selectedId
                    ? (suppliers.find((s) => s.id === selectedId)?.name ?? 'Selecione o fornecedor padrão')
                    : 'Selecione o fornecedor padrão'

                  return (
                    <Select value={selectedId} onValueChange={(v) => field.onChange(v as string)}>
                      <SelectTrigger>
                        <span className={selectedId ? 'text-foreground' : 'text-muted-foreground'}>
                          {selectedName}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
            </div>

            <div className="sm:col-span-2 -mt-2 text-xs leading-5 text-muted-foreground">
              Esse fornecedor funciona como sugestão padrão nas próximas entradas de estoque e pode ser trocado em cada compra.
            </div>

            {/* Preço de custo */}
            <Controller
              control={control}
              name="cost_price"
              render={({ field }) => (
                <MaskedInputField
                  mask="money"
                  label="Preço de Custo (R$)"
                  placeholder="R$ 0,00"
                  error={errors.cost_price?.message}
                  {...field}
                  value={field.value == null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Preço de venda */}
            <Controller
              control={control}
              name="sale_price"
              render={({ field }) => (
                <MaskedInputField
                  mask="money"
                  label="Preço de Venda (R$)"
                  placeholder="R$ 0,00"
                  error={errors.sale_price?.message}
                  {...field}
                  value={field.value == null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Estoque mínimo */}
            <Controller
              control={control}
              name="min_stock"
              render={({ field }) => (
                <InputField
                  label="Estoque Mínimo"
                  placeholder="0"
                  type="number"
                  error={errors.min_stock?.message}
                  {...field}
                  value={!field.value ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Observações */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm font-medium">Observações</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais sobre a peça..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
              {errors.notes && (
                <p className="text-destructive text-xs mt-1">{errors.notes.message}</p>
              )}
            </div>

            {/* Ativo */}
            <div className="sm:col-span-2 mt-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Peça Ativa
                  </Label>
                )}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" form="part-form" disabled={isPending} loading={isPending}>
            Salvar Peça
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
