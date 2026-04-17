'use client'

import * as React from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowDownToLine, SlidersHorizontal } from 'lucide-react'
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
import { DatePickerField } from '@/components/ui/date-picker-field'
import { InputField } from '@/components/ui/input-field'
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
}

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
      quantity: '',
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
      quantity: '',
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
            <InputField
              label={`Quantidade a entrar *${selectedPart ? ` (saldo atual: ${currentStock} ${selectedPart.unit})` : ''}`}
              type="number"
              min={1}
              step={1}
              placeholder="0"
              error={errors.quantity?.message}
              disabled={!selectedPart}
              {...field}
              value={String(field.value ?? '')}
              onChange={(e) => field.onChange(e.target.value)}
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

      <DialogFooter>
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
      notes: '',
    },
  })

  React.useEffect(() => {
    const stock = getStockForBranch(stockByPartBranch, part.id, initialBranchId)
    reset({
      part_id: part.id,
      branch_id: initialBranchId,
      current_stock: stock,
      new_quantity: stock,
      notes: '',
    })
  }, [part.id, initialBranchId, stockByPartBranch, reset])

  // Quando a filial muda, atualiza current_stock e reseta new_quantity para o saldo real daquela filial
  const watchedBranchId = watch('branch_id')
  React.useEffect(() => {
    const stock = getStockForBranch(stockByPartBranch, part.id, watchedBranchId)
    setValue('current_stock', stock)
    setValue('new_quantity', stock)
  }, [watchedBranchId, part.id, stockByPartBranch, setValue])

  const currentStock = watch('current_stock')
  const newQty = watch('new_quantity')
  const delta = (Number(newQty) || 0) - (Number(currentStock) || 0)

  const onSubmit = (data: StockAjusteFormValues) => {
    startTransition(async () => {
      try {
        const result = await createStockAjuste(data)
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
      {/* Filial */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium">Filial *</Label>
        <Controller
          control={control}
          name="branch_id"
          render={({ field }) => {
            const selected = branches.find((b) => b.id === field.value)
            return (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as string)}>
                <SelectTrigger className={errors.branch_id ? 'border-destructive' : ''}>
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
        {errors.branch_id && (
          <p className="text-destructive text-xs mt-1">{errors.branch_id.message}</p>
        )}
      </div>

      {/* Saldo atual (informativo, reativo à filial selecionada) */}
      <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Saldo atual nesta filial: </span>
        <span className="font-semibold tabular-nums">{Number(currentStock)} {part.unit}</span>
        {part.min_stock > 0 && (
          <span className="text-muted-foreground ml-2">(mínimo: {part.min_stock})</span>
        )}
      </div>

      {/* Nova quantidade */}
      <Controller
        control={control}
        name="new_quantity"
        render={({ field }) => (
          <InputField
            label="Nova quantidade real *"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            error={errors.new_quantity?.message}
            helper={
              delta !== 0
                ? `Variação: ${delta > 0 ? '+' : ''}${delta} ${part.unit}`
                : undefined
            }
            {...field}
            value={String(field.value ?? '')}
            onChange={(e) => field.onChange(e.target.value)}
          />
        )}
      />

      {/* Observações */}
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <InputField
            label="Motivo do ajuste (opcional)"
            placeholder="Ex: Contagem física realizada em 04/04/2026..."
            error={errors.notes?.message}
            {...field}
            value={field.value ?? ''}
          />
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || delta === 0} className="gap-2 cursor-pointer">
          <SlidersHorizontal className="size-4" />
          {isPending ? 'Salvando...' : 'Confirmar Ajuste'}
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEntrada ? (
              <>
                <ArrowDownToLine className="size-5 text-primary" />
                Registrar Entrada de Estoque
              </>
            ) : (
              <>
                <SlidersHorizontal className="size-5 text-primary" />
                Ajuste de Inventário
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedPart ? (
              <>
                <span className="font-medium text-foreground">{selectedPart.name}</span>
                {selectedPart.sku && <span className="text-muted-foreground"> · SKU {selectedPart.sku}</span>}
              </>
            ) : (
              'Selecione a peça, informe o fornecedor real da compra e registre as datas do recebimento.'
            )}
          </DialogDescription>
        </DialogHeader>

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
            initialBranchId={initialBranchId}
            branches={branches}
            stockByPartBranch={stockByPartBranch}
            onSuccess={onSuccess}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
