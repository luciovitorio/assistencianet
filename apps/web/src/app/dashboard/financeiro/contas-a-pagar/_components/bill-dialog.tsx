'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CircleDollarSign } from 'lucide-react'
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
  billCreateSchema,
  BILL_CATEGORIES,
  BILL_CATEGORY_LABELS,
  BILL_RECURRENCES,
  BILL_RECURRENCE_LABELS,
  type BillCategory,
  type BillCreateSchema,
} from '@/lib/validations/bills'
import { createBill, updateBill } from '@/app/actions/bills'
import type { BillRow } from '@/app/actions/bills'
import type { BranchOption, SupplierOption } from './bills-list'

interface BillDialogProps {
  mode: 'create' | 'edit'
  bill: BillRow | null
  branches: BranchOption[]
  suppliers: SupplierOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BillDialog({
  mode,
  bill,
  branches,
  suppliers,
  open,
  onOpenChange,
  onSuccess,
}: BillDialogProps) {
  const [isPending, startTransition] = React.useTransition()
  const isEdit = mode === 'edit'

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BillCreateSchema>({
    resolver: zodResolver(billCreateSchema),
    defaultValues: {
      branch_id: bill?.branch_id ?? (branches[0]?.id ?? ''),
      category: (bill?.category as BillCategory | undefined) ?? 'outro',
      description: bill?.description ?? '',
      supplier_id: bill?.supplier_id ?? '',
      amount: bill?.amount ?? '',
      due_date: bill?.due_date ?? new Date().toISOString().slice(0, 10),
      notes: bill?.notes ?? '',
      recurrence: '',
      recurrence_count: 12,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        branch_id: bill?.branch_id ?? (branches[0]?.id ?? ''),
        category: (bill?.category as BillCategory | undefined) ?? 'outro',
        description: bill?.description ?? '',
        supplier_id: bill?.supplier_id ?? '',
        amount: bill?.amount ?? '',
        due_date: bill?.due_date ?? new Date().toISOString().slice(0, 10),
        notes: bill?.notes ?? '',
        recurrence: '',
        recurrence_count: 12,
      })
    }
  }, [open, bill, branches, reset])

  const watchedCategory = watch('category')
  const watchedRecurrence = watch('recurrence')
  const hasRecurrence = !!watchedRecurrence

  // Se categoria mudar para algo que não seja fornecedor, limpa o supplier
  React.useEffect(() => {
    if (watchedCategory !== 'fornecedor') {
      setValue('supplier_id', '')
    }
  }, [watchedCategory, setValue])

  const onSubmit = (data: BillCreateSchema) => {
    startTransition(async () => {
      try {
        if (isEdit && bill) {
          const result = await updateBill(bill.id, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Lançamento atualizado com sucesso.')
        } else {
          const result = await createBill(data)
          if (result?.error) throw new Error(result.error)
          const count = result.count ?? 1
          toast.success(
            count > 1
              ? `${count} lançamentos recorrentes criados com sucesso.`
              : 'Lançamento criado com sucesso.',
          )
        }
        onSuccess()
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Erro ao salvar lançamento.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="size-5 text-primary" />
            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Altere os dados do lançamento. A edição afeta apenas esta entrada.'
              : 'Registre um compromisso financeiro. Use a opção de recorrência para despesas fixas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Filial */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Filial *</Label>
              <Controller
                control={control}
                name="branch_id"
                render={({ field }) => {
                  const selected = branches.find((b) => b.id === field.value)
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
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
              {errors.branch_id && <p className="text-destructive mt-1 text-xs">{errors.branch_id.message}</p>}
            </div>

            {/* Categoria */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Categoria *</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => {
                  const selected = BILL_CATEGORY_LABELS[field.value as keyof typeof BILL_CATEGORY_LABELS]
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                        <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                          {selected ?? 'Selecione a categoria'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {BILL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{BILL_CATEGORY_LABELS[cat]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
              {errors.category && <p className="text-destructive mt-1 text-xs">{errors.category.message}</p>}
            </div>
          </div>

          {/* Descrição */}
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <InputField
                label="Descrição (opcional)"
                placeholder="Ex: Aluguel sala comercial, conta de energia abril..."
                error={errors.description?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          {/* Fornecedor (só se categoria = fornecedor) */}
          {watchedCategory === 'fornecedor' && (
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Fornecedor (opcional)</Label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => {
                  const selected = suppliers.find((s) => s.id === field.value)
                  return (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v === '__none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                          {selected ? selected.name : 'Selecione o fornecedor'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Não informar</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Valor */}
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MaskedInputField
                  mask="money"
                  label="Valor *"
                  placeholder="R$ 0,00"
                  error={errors.amount?.message}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />

            {/* Vencimento */}
            <Controller
              control={control}
              name="due_date"
              render={({ field }) => (
                <DatePickerField
                  label="Vencimento *"
                  placeholder="Selecione o vencimento"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.due_date?.message}
                />
              )}
            />
          </div>

          {/* Recorrência (só na criação) */}
          {!isEdit && (
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Lançamento recorrente</p>
                  <p className="text-xs text-muted-foreground">
                    Para despesas fixas como aluguel, energia, folha...
                  </p>
                </div>
                <Controller
                  control={control}
                  name="recurrence"
                  render={({ field }) => (
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked ? 'mensal' : '')}
                    />
                  )}
                />
              </div>

              {hasRecurrence && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium">Periodicidade</Label>
                    <Controller
                      control={control}
                      name="recurrence"
                      render={({ field }) => (
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <span className="text-foreground">
                              {BILL_RECURRENCE_LABELS[field.value as keyof typeof BILL_RECURRENCE_LABELS] ?? 'Mensal'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {BILL_RECURRENCES.map((r) => (
                              <SelectItem key={r} value={r}>{BILL_RECURRENCE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <Controller
                    control={control}
                    name="recurrence_count"
                    render={({ field }) => (
                      <InputField
                        label="Nº de parcelas"
                        type="number"
                        min={2}
                        max={60}
                        step={1}
                        helper="Quantas instâncias criar (máx. 60)"
                        error={errors.recurrence_count?.message}
                        {...field}
                        value={String(field.value ?? 12)}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <InputField
                label="Observações (opcional)"
                placeholder="Ex: NF 4521, referente a março..."
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
              <CircleDollarSign className="size-4" />
              {isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
