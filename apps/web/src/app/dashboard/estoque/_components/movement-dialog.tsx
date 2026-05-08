'use client'

import * as React from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowRight, SlidersHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { InputField } from '@/components/ui/input-field'
import { StepperInput } from '@/components/ui/stepper-input'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  stockEntradaSchema,
  stockAjusteSchema,
  type StockEntradaSchema,
  type StockAjusteSchema,
} from '@/lib/validations/stock'
import { createStockEntrada, createStockAjuste } from '@/app/actions/stock'
import { cn } from '@/lib/utils'
import type { PartRow, BranchOption, SupplierOption } from './stock-list'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

interface MovementDialogProps {
  mode: 'entrada' | 'ajuste'
  part: PartRow | null
  parts: PartRow[]
  suppliers: SupplierOption[]
  initialBranchId: string
  branches: BranchOption[]
  // Mapa de saldo por "part_id:branch_id" — fonte da verdade para calcular saldo ao trocar filial
  stockByPartBranch: Record<string, number>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface EntradaFormProps {
  part: PartRow | null
  parts: PartRow[]
  suppliers: SupplierOption[]
  initialBranchId: string
  branches: BranchOption[]
  stockByPartBranch: Record<string, number>
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface AjusteFormProps {
  part: PartRow
  parts: PartRow[]
  initialBranchId: string
  branches: BranchOption[]
  stockByPartBranch: Record<string, number>
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type StockEntradaFormValues = Omit<StockEntradaSchema, 'quantity' | 'unit_cost'> & {
  quantity: string | number
  unit_cost: string | number
}

type StockAjusteFormValues = Omit<StockAjusteSchema, 'new_quantity'> & {
  new_quantity: string | number
  reason: string
  observacao: string
}

const MOTIVO_OPTIONS = [
  'Contagem física',
  'Quebra ou avaria',
  'Perda ou furto',
  'Vencimento',
  'Correção de lançamento',
  'Outros',
]

function getStockForBranch(stockByPartBranch: Record<string, number>, partId: string, branchId: string) {
  return stockByPartBranch[`${partId}:${branchId}`] ?? 0
}

// ── Entrada ───────────────────────────────────────────────────────────────────

function EntradaForm({
  part,
  parts,
  suppliers,
  initialBranchId,
  branches,
  stockByPartBranch,
  onSuccess,
  onOpenChange,
}: EntradaFormProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockEntradaFormValues>({
    resolver: zodResolver(stockEntradaSchema) as unknown as Resolver<StockEntradaFormValues>,
    defaultValues: {
      part_id: part?.id || '',
      branch_id: initialBranchId,
      supplier_id: part?.supplier_id || '',
      set_as_default_supplier: false,
      invoice_date: '',
      entry_date: new Date().toISOString().slice(0, 10),
      quantity: 1,
      unit_cost: '',
      notes: '',
    },
  })

  React.useEffect(() => {
    reset({
      part_id: part?.id || '',
      branch_id: initialBranchId,
      supplier_id: part?.supplier_id || '',
      set_as_default_supplier: false,
      invoice_date: '',
      entry_date: new Date().toISOString().slice(0, 10),
      quantity: 1,
      unit_cost: '',
      notes: '',
    })
  }, [part?.id, part?.supplier_id, initialBranchId, reset])

  const watchedPartId = watch('part_id')
  const watchedBranchId = watch('branch_id')
  const watchedSupplierId = watch('supplier_id')
  const selectedPart = React.useMemo(
    () => parts.find((candidate) => candidate.id === watchedPartId) ?? null,
    [parts, watchedPartId]
  )
  const currentStock = selectedPart
    ? getStockForBranch(stockByPartBranch, selectedPart.id, watchedBranchId)
    : 0

  React.useEffect(() => {
    setValue('supplier_id', selectedPart?.supplier_id || '')
  }, [selectedPart?.supplier_id, setValue])

  React.useEffect(() => {
    if (!watchedSupplierId) {
      setValue('set_as_default_supplier', false)
    }
  }, [watchedSupplierId, setValue])

  const onSubmit = (data: StockEntradaFormValues) => {
    startTransition(async () => {
      try {
        const result = await createStockEntrada(data)
        if (result?.error) throw new Error(result.error)
        toast.success('Entrada de estoque registrada com sucesso.')
        if (result?.warning) {
          toast.warning(result.warning)
        }
        onSuccess()
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Erro ao registrar entrada.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" id="entrada-form">
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <Label className="mb-1.5 block text-sm font-medium">Peça *</Label>
          <Controller
            control={control}
            name="part_id"
            render={({ field }) => {
              const selected = parts.find((candidate) => candidate.id === field.value)
              return (
                <Select value={field.value} onValueChange={(value) => field.onChange(value as string)}>
                  <SelectTrigger className={errors.part_id ? 'border-destructive' : ''}>
                    <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                      {selected ? selected.name : 'Selecione a peça'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
          {errors.part_id && (
            <p className="text-destructive mt-1 text-xs">{errors.part_id.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Filial *</Label>
          <Controller
            control={control}
            name="branch_id"
            render={({ field }) => {
              const selected = branches.find((branch) => branch.id === field.value)
              return (
                <Select value={field.value} onValueChange={(value) => field.onChange(value as string)}>
                  <SelectTrigger className={errors.branch_id ? 'border-destructive' : ''}>
                    <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                      {selected ? selected.name : 'Selecione a filial'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
          {errors.branch_id && (
            <p className="text-destructive mt-1 text-xs">{errors.branch_id.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Fornecedor desta entrada</Label>
          <Controller
            control={control}
            name="supplier_id"
            render={({ field }) => {
              const selected = suppliers.find((supplier) => supplier.id === field.value)
              return (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => field.onChange(value === '__none' ? '' : value)}
                >
                  <SelectTrigger className={errors.supplier_id ? 'border-destructive' : ''}>
                    <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                      {selected ? selected.name : 'Selecione o fornecedor'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Não informar</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
          {errors.supplier_id && (
            <p className="text-destructive mt-1 text-xs">{errors.supplier_id.message}</p>
          )}
        </div>
      </div>

      <Controller
        control={control}
        name="set_as_default_supplier"
        render={({ field }) => (
          <Label
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              watchedSupplierId
                ? 'cursor-pointer border-border bg-muted/20'
                : 'cursor-not-allowed border-border/60 bg-muted/10 text-muted-foreground'
            }`}
          >
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              disabled={!watchedSupplierId}
              className="mt-0.5"
            />
            <span className="space-y-1">
              <span className="block font-medium text-foreground">Definir como fornecedor padrão da peça</span>
              <span className="block text-xs text-muted-foreground">
                Use isso quando esta compra indicar qual fornecedor deve aparecer preenchido por padrão nas próximas entradas.
              </span>
            </span>
          </Label>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="invoice_date"
          render={({ field }) => (
            <DatePickerField
              label="Data da nota"
              placeholder="Selecione a data da nota"
              value={field.value || ''}
              onChange={field.onChange}
              error={errors.invoice_date?.message}
              helper="Use a data emitida no documento fiscal, se houver."
              className={CONTROL}
            />
          )}
        />

        <Controller
          control={control}
          name="entry_date"
          render={({ field }) => (
            <DatePickerField
              label="Data de entrada *"
              placeholder="Selecione a data de entrada"
              value={field.value}
              onChange={field.onChange}
              error={errors.entry_date?.message}
              helper="Pode ser diferente da data da nota quando o recebimento ocorreu depois."
              className={CONTROL}
            />
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="quantity"
          render={({ field }) => (
            <StepperInput
              label="Quantidade a entrar *"
              value={field.value}
              onChange={field.onChange}
              min={1}
              disabled={!selectedPart}
              helper={selectedPart ? `Saldo atual: ${currentStock} ${selectedPart.unit}` : undefined}
              error={errors.quantity?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="unit_cost"
          render={({ field }) => (
            <MaskedInputField
              mask="money"
              label="Custo unitário (opcional)"
              placeholder="R$ 0,00"
              error={errors.unit_cost?.message}
              disabled={!selectedPart}
              {...field}
              value={field.value ?? ''}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <InputField
            label="Observações (opcional)"
            placeholder="Ex: Compra NF 1234, entrega parcial, conferido sem avarias..."
            error={errors.notes?.message}
            {...field}
            value={field.value ?? ''}
          />
        )}
      />

      <DialogFooter className="-mx-6 -mb-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2 cursor-pointer">
          <ArrowDownToLine className="size-4" />
          {isPending ? 'Salvando...' : 'Registrar Entrada'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Ajuste ────────────────────────────────────────────────────────────────────

function AjusteForm({
  part,
  parts,
  initialBranchId,
  branches,
  stockByPartBranch,
  onSuccess,
  onOpenChange,
}: AjusteFormProps) {
  const [isPending, startTransition] = React.useTransition()

  const initialStock = getStockForBranch(stockByPartBranch, part.id, initialBranchId)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockAjusteFormValues>({
    resolver: zodResolver(stockAjusteSchema) as unknown as Resolver<StockAjusteFormValues>,
    defaultValues: {
      part_id: part.id,
      branch_id: initialBranchId,
      current_stock: initialStock,
      new_quantity: initialStock,
      reason: '',
      observacao: '',
    },
  })

  React.useEffect(() => {
    const stock = getStockForBranch(stockByPartBranch, part.id, initialBranchId)
    reset({
      part_id: part.id,
      branch_id: initialBranchId,
      current_stock: stock,
      new_quantity: stock,
      reason: '',
      observacao: '',
    })
  }, [part.id, initialBranchId, stockByPartBranch, reset])

  const watchedPartId = watch('part_id')
  const watchedBranchId = watch('branch_id')

  React.useEffect(() => {
    const stock = getStockForBranch(stockByPartBranch, watchedPartId, watchedBranchId)
    setValue('current_stock', stock)
    setValue('new_quantity', stock)
  }, [watchedPartId, watchedBranchId, stockByPartBranch, setValue])

  const currentStock = watch('current_stock')
  const newQty = watch('new_quantity')
  const delta = (Number(newQty) || 0) - (Number(currentStock) || 0)
  const selectedPart = parts.find((p) => p.id === watchedPartId) ?? part

  const onSubmit = (data: StockAjusteFormValues) => {
    startTransition(async () => {
      try {
        const notes = [data.reason, data.observacao].filter(Boolean).join(' — ') || undefined
        const result = await createStockAjuste({ ...data, notes })
        if (result?.error) throw new Error(result.error)
        toast.success('Estoque ajustado com sucesso.')
        onSuccess()
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Erro ao ajustar estoque.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" id="ajuste-form">
      {/* Peça */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium">Peça</Label>
        <Controller
          control={control}
          name="part_id"
          render={({ field }) => {
            const selected = parts.find((p) => p.id === field.value)
            return (
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger className={cn('w-full', errors.part_id ? 'border-destructive' : '')}>
                  <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                    {selected ? selected.name + (selected.sku ? ` — ${selected.sku}` : '') : 'Selecione a peça'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {parts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` — ${p.sku}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
        {errors.part_id && <p className="mt-1 text-xs text-destructive">{errors.part_id.message}</p>}
      </div>

      {/* Filial */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium">Filial</Label>
        <Controller
          control={control}
          name="branch_id"
          render={({ field }) => {
            const selected = branches.find((b) => b.id === field.value)
            return (
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger className={cn('w-full', errors.branch_id ? 'border-destructive' : '')}>
                  <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                    {selected ? selected.name : 'Selecione a filial'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
        {errors.branch_id && <p className="mt-1 text-xs text-destructive">{errors.branch_id.message}</p>}
      </div>

      {/* ATUAL → NOVO */}
      <div className="flex items-center gap-5 rounded-xl border border-border bg-muted/30 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atual</span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{Number(currentStock)}</span>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Novo</span>
          <Controller
            control={control}
            name="new_quantity"
            render={({ field }) => (
              <input
                type="number"
                min={0}
                step={1}
                className="w-20 border-b-2 border-primary bg-transparent text-2xl font-bold tabular-nums text-primary outline-none"
                value={String(field.value ?? '')}
                onChange={(e) => field.onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            )}
          />
        </div>
        {delta !== 0 && (
          <span className={cn('ml-auto text-sm font-semibold tabular-nums', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
            {delta > 0 ? '+' : ''}{delta} {selectedPart.unit}
          </span>
        )}
      </div>
      {errors.new_quantity && <p className="-mt-3 text-xs text-destructive">{errors.new_quantity.message}</p>}

      {/* Motivo do ajuste */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium">Motivo do ajuste</Label>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
              <SelectTrigger className="w-full">
                <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                  {field.value || 'Selecione o motivo'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Observação */}
      <Controller
        control={control}
        name="observacao"
        render={({ field }) => (
          <InputField
            label="Observação (opcional)"
            placeholder="Detalhes do ajuste"
            error={errors.notes?.message}
            {...field}
            value={field.value ?? ''}
          />
        )}
      />

      <DialogFooter className="-mx-6 -mb-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || delta === 0} className="cursor-pointer">
          {isPending ? 'Salvando...' : 'Salvar ajuste'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

export function MovementDialog({
  mode,
  part,
  parts,
  suppliers,
  initialBranchId,
  branches,
  stockByPartBranch,
  open,
  onOpenChange,
  onSuccess,
}: MovementDialogProps) {
  const isEntrada = mode === 'entrada'
  const selectedPart = part ?? null

  if (!isEntrada && !selectedPart) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="mx-0 mt-0 px-6 py-4 border-border">
          <DialogTitle className="flex items-center gap-2">
            {isEntrada ? (
              <>
                <ArrowDownToLine className="size-5 text-primary" />
                Registrar Entrada de Estoque
              </>
            ) : (
              <>
                <SlidersHorizontal className="size-5 text-primary" />
                Ajustar estoque
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
        {isEntrada ? (
          <EntradaForm
            part={selectedPart}
            parts={parts}
            suppliers={suppliers}
            initialBranchId={initialBranchId}
            branches={branches}
            stockByPartBranch={stockByPartBranch}
            onSuccess={onSuccess}
            onOpenChange={onOpenChange}
          />
        ) : (
          <AjusteForm
            part={selectedPart!}
            parts={parts}
            initialBranchId={initialBranchId}
            branches={branches}
            stockByPartBranch={stockByPartBranch}
            onSuccess={onSuccess}
            onOpenChange={onOpenChange}
          />
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
