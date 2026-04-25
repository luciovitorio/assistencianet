'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  CalendarIcon,
  ChevronDown,
  FileText,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import {
  createServiceOrderEstimate,
  updateServiceOrderEstimateDraft,
} from '@/app/actions/service-order-estimates'
import { SendEstimateDialog } from './send-estimate-dialog'
import { addDaysToDateInputValue } from '@/lib/company-settings'
import { applyMoneyMask } from '@/lib/masks'
import {
  ESTIMATE_ITEM_TYPE_LABELS,
  ESTIMATE_ITEM_TYPES,
  SERVICE_ORDER_ESTIMATE_STATUS_COLORS,
  SERVICE_ORDER_ESTIMATE_STATUS_LABELS,
  isServiceOrderEstimateExpired,
  serviceOrderEstimateSchema,
  type ServiceOrderEstimateSchema,
} from '@/lib/validations/service-order-estimate'
import { type ServiceOrderStatus } from '@/lib/validations/service-order'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EstimateItemRecord {
  id: string
  part_id?: string | null
  item_type: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  notes: string | null
}

export interface ServiceOrderEstimateRecord {
  id: string
  version: number
  status: string
  approval_channel: string | null
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  valid_until: string | null
  warranty_days: number | null
  sent_at: string | null
  approved_at: string | null
  rejected_at: string | null
  notes: string | null
  created_at: string
  items: EstimateItemRecord[]
}

interface CatalogServiceEntry {
  id: string
  name: string
  price: number | null
}

interface CatalogPartEntry {
  id: string
  name: string
  sale_price: number | null
}

interface ServiceOrderEstimatesPanelProps {
  mode?: 'all' | 'history' | 'create'
  serviceOrderId: string
  serviceOrderNumber: number
  initialEstimates: ServiceOrderEstimateRecord[]
  catalogServices: CatalogServiceEntry[]
  catalogParts: CatalogPartEntry[]
  stockAvailability: Record<string, number>
  defaultWarrantyDays: number
  defaultEstimateValidityDays: number
  serviceOrderStatus: ServiceOrderStatus
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
}

interface PendingSend {
  estimateId: string
  version: number
  totalAmount: number
  validUntil: string | null
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (!value) return 0

  // Handle masked money format "R$ 1.000,00"
  const normalized = String(value)
    .trim()
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const toMoneyInputValue = (value: number | null | undefined) =>
  applyMoneyMask(String(Math.round((value ?? 0) * 100)))

// ─── DatePicker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false)

  const date = value ? new Date(`${value}T12:00:00`) : undefined
  const displayValue = date ? date.toLocaleDateString('pt-BR') : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-muted px-2.5 py-1 text-sm transition-colors outline-none hover:bg-background focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className={displayValue ? 'text-foreground' : 'text-muted-foreground'}>
          {displayValue ?? 'Selecionar data'}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          locale={ptBR}
          onSelect={(d) => {
            if (d) {
              const year = d.getFullYear()
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              onChange(`${year}-${month}-${day}`)
            } else {
              onChange('')
            }
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── CatalogCombobox ──────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  name: string
  price: number | null
}

function CatalogCombobox({
  items,
  description,
  onSelect,
  getAvailability,
}: {
  items: CatalogItem[]
  description: string
  onSelect: (id: string, name: string, price: number | null) => void
  getAvailability?: (id: string) => number | undefined
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((item) => item.name.toLowerCase().includes(q)) : items
  }, [items, query])

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery('')
      }}
    >
      <PopoverTrigger className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-muted px-2.5 py-1 text-sm transition-colors outline-none hover:bg-background focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className={`truncate ${description ? 'text-foreground' : 'text-muted-foreground'}`}>
          {description || 'Selecionar do catálogo'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 gap-0 p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="h-8 bg-background"
          />
        </div>
        <div className="max-h-52 overflow-y-auto px-1 py-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum item encontrado.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id, item.name, item.price)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="truncate">{item.name}</span>
                <div className="ml-2 flex shrink-0 flex-col items-end gap-0.5">
                  {item.price !== null && (
                    <span className="text-xs text-muted-foreground">
                      {currencyFormatter.format(item.price)}
                    </span>
                  )}
                  {getAvailability &&
                    (() => {
                      const avail = getAvailability(item.id)
                      if (avail === undefined) return null
                      return (
                        <span
                          className={`text-[10px] font-medium ${avail <= 0 ? 'text-destructive' : avail <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {avail <= 0 ? 'Sem estoque' : `${avail} disp.`}
                        </span>
                      )
                    })()}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Default form values ──────────────────────────────────────────────────────

const createDefaultValues = (
  defaultWarrantyDays: number,
  defaultEstimateValidityDays: number
): ServiceOrderEstimateSchema => ({
  valid_until:
    defaultEstimateValidityDays > 0 ? addDaysToDateInputValue(defaultEstimateValidityDays) : '',
  warranty_days: defaultWarrantyDays,
  discount_amount: '0',
  notes: '',
  items: [
    {
      part_id: '',
      item_type: 'servico',
      description: '',
      quantity: '1',
      unit_price: '0',
      notes: '',
    },
  ],
})

const estimateToFormValues = (
  estimate: ServiceOrderEstimateRecord,
  defaultWarrantyDays: number,
  defaultEstimateValidityDays: number
): ServiceOrderEstimateSchema => ({
  valid_until:
    estimate.valid_until ??
    (defaultEstimateValidityDays > 0 ? addDaysToDateInputValue(defaultEstimateValidityDays) : ''),
  warranty_days: estimate.warranty_days ?? defaultWarrantyDays,
  discount_amount: toMoneyInputValue(estimate.discount_amount),
  notes: estimate.notes ?? '',
  items:
    estimate.items.length > 0
      ? estimate.items.map((item) => ({
          part_id: item.part_id ?? '',
          item_type: item.item_type as ServiceOrderEstimateSchema['items'][number]['item_type'],
          description: item.description,
          quantity: String(item.quantity),
          unit_price: toMoneyInputValue(item.unit_price),
          notes: item.notes ?? '',
        }))
      : createDefaultValues(defaultWarrantyDays, defaultEstimateValidityDays).items,
})

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ServiceOrderEstimatesPanel({
  mode = 'all',
  serviceOrderId,
  serviceOrderNumber,
  initialEstimates,
  catalogServices,
  catalogParts,
  stockAvailability,
  defaultWarrantyDays,
  defaultEstimateValidityDays,
  serviceOrderStatus,
  clientName,
  clientPhone,
  clientEmail,
}: ServiceOrderEstimatesPanelProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const [isPending, startTransition] = React.useTransition()
  const [pendingSend, setPendingSend] = React.useState<PendingSend | null>(null)
  const [resendEstimate, setResendEstimate] = React.useState<ServiceOrderEstimateRecord | null>(
    null
  )
  const [showDiscount, setShowDiscount] = React.useState(false)
  const fallbackDefaultValues = React.useMemo(
    () => createDefaultValues(defaultWarrantyDays, defaultEstimateValidityDays),
    [defaultEstimateValidityDays, defaultWarrantyDays]
  )
  const activeDraftEstimate = React.useMemo(
    () => initialEstimates.find((estimate) => estimate.status === 'rascunho') ?? null,
    [initialEstimates]
  )
  const defaultValues = React.useMemo(
    () =>
      activeDraftEstimate
        ? estimateToFormValues(
            activeDraftEstimate,
            defaultWarrantyDays,
            defaultEstimateValidityDays
          )
        : fallbackDefaultValues,
    [activeDraftEstimate, defaultEstimateValidityDays, defaultWarrantyDays, fallbackDefaultValues]
  )
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceOrderEstimateSchema>({
    resolver: zodResolver(serviceOrderEstimateSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = useWatch({ control, name: 'items' })
  const watchedDiscount = useWatch({ control, name: 'discount_amount' })
  const watchedValidUntil = useWatch({ control, name: 'valid_until' }) ?? ''
  const normalizedWatchedItems = React.useMemo(() => watchedItems ?? [], [watchedItems])
  const canManageEstimates =
    serviceOrderStatus === 'aguardando' ||
    serviceOrderStatus === 'em_analise' ||
    serviceOrderStatus === 'reprovado' ||
    serviceOrderStatus === 'enviado_terceiro'
  const showHistory = mode === 'all' || mode === 'history'
  const showCreateForm = mode === 'all' || mode === 'create'

  const previewSubtotal = React.useMemo(
    () =>
      normalizedWatchedItems.reduce((acc, item) => {
        return acc + toNumber(item?.quantity) * toNumber(item?.unit_price)
      }, 0),
    [normalizedWatchedItems]
  )

  const previewDiscount = toNumber(watchedDiscount)
  const previewTotal = Math.max(previewSubtotal - previewDiscount, 0)

  React.useEffect(() => {
    reset(defaultValues)
    setShowDiscount(toNumber(defaultValues.discount_amount) > 0)
  }, [defaultValues, reset])

  const onSubmit = (data: ServiceOrderEstimateSchema) => {
    startTransition(async () => {
      try {
        const result = activeDraftEstimate
          ? await updateServiceOrderEstimateDraft(serviceOrderId, activeDraftEstimate.id, data)
          : await createServiceOrderEstimate(serviceOrderId, data)

        if (result?.error) throw new Error(result.error)

        if (!activeDraftEstimate && mode !== 'create') {
          reset(createDefaultValues(defaultWarrantyDays, defaultEstimateValidityDays))
        }

        setPendingSend({
          estimateId: result.estimateId!,
          version: result.version ?? 1,
          totalAmount: result.totalAmount ?? 0,
          validUntil: data.valid_until || null,
        })
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Erro ao criar orcamento.')
      }
    })
  }

  const handleSendDialogClose = (options?: { keepOnPage?: boolean }) => {
    setPendingSend(null)

    if (options?.keepOnPage) {
      router.refresh()
      return
    }

    if (mode === 'create') {
      navigate('/dashboard/ordens-de-servico')
      return
    }

    router.refresh()
  }

  return (
    <>
      {pendingSend && (
        <SendEstimateDialog
          open
          onClose={handleSendDialogClose}
          serviceOrderId={serviceOrderId}
          estimateId={pendingSend.estimateId}
          osNumber={serviceOrderNumber}
          estimateVersion={pendingSend.version}
          totalAmount={pendingSend.totalAmount}
          validUntil={pendingSend.validUntil}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
        />
      )}
      {resendEstimate && (
        <SendEstimateDialog
          open
          onClose={() => {
            setResendEstimate(null)
            router.refresh()
          }}
          serviceOrderId={serviceOrderId}
          estimateId={resendEstimate.id}
          osNumber={serviceOrderNumber}
          estimateVersion={resendEstimate.version}
          totalAmount={resendEstimate.total_amount}
          validUntil={resendEstimate.valid_until}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
        />
      )}
      <div className="space-y-6">
        {showHistory ? (
          <Card>
            <CardHeader>
              <CardTitle>Historico de orcamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {initialEstimates.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                  <FileText className="mb-3 size-10 text-muted-foreground/40" />
                  <h3 className="text-base font-medium">Nenhum orcamento emitido</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Crie o primeiro orcamento desta OS para registrar a proposta comercial e o
                    historico de aprovacao do cliente.
                  </p>
                </div>
              ) : (
                initialEstimates.map((estimate) => {
                  const isExpired = isServiceOrderEstimateExpired(
                    estimate.valid_until,
                    estimate.status
                  )

                  return (
                    <div key={estimate.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold">
                              Orcamento v{estimate.version}
                            </h3>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                SERVICE_ORDER_ESTIMATE_STATUS_COLORS[
                                  estimate.status as keyof typeof SERVICE_ORDER_ESTIMATE_STATUS_COLORS
                                ] ?? 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {SERVICE_ORDER_ESTIMATE_STATUS_LABELS[
                                estimate.status as keyof typeof SERVICE_ORDER_ESTIMATE_STATUS_LABELS
                              ] ?? estimate.status}
                            </span>
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                                <AlertTriangle className="size-3" />
                                Vencido
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Criado em {dateFormatter.format(new Date(estimate.created_at))}
                          </p>
                          {mode !== 'history' && estimate.status === 'rascunho' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 gap-1.5"
                              onClick={() => setResendEstimate(estimate)}
                              disabled={!canManageEstimates}
                            >
                              <Send className="size-3.5" />
                              Enviar ao cliente
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm md:min-w-80">
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Subtotal
                            </p>
                            <p className="mt-1 font-semibold">
                              {currencyFormatter.format(estimate.subtotal_amount)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Desconto
                            </p>
                            <p className="mt-1 font-semibold">
                              {currencyFormatter.format(estimate.discount_amount)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-primary/5 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Total
                            </p>
                            <p className="mt-1 font-semibold text-primary">
                              {currencyFormatter.format(estimate.total_amount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(estimate.valid_until ||
                        estimate.notes ||
                        estimate.sent_at ||
                        estimate.approved_at ||
                        estimate.rejected_at) && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {estimate.valid_until && (
                            <div className="text-sm">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Validade
                              </p>
                              <p className={isExpired ? 'font-semibold text-rose-700' : undefined}>
                                {new Date(`${estimate.valid_until}T12:00:00`).toLocaleDateString(
                                  'pt-BR'
                                )}
                              </p>
                            </div>
                          )}
                          {estimate.warranty_days !== null && (
                            <div className="text-sm">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Garantia
                              </p>
                              <p>{estimate.warranty_days} dias</p>
                            </div>
                          )}
                          {estimate.sent_at && (
                            <div className="text-sm">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Enviado em
                              </p>
                              <p>{dateFormatter.format(new Date(estimate.sent_at))}</p>
                            </div>
                          )}
                          {estimate.approved_at && (
                            <div className="text-sm">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Aprovado em
                              </p>
                              <p>{dateFormatter.format(new Date(estimate.approved_at))}</p>
                            </div>
                          )}
                          {estimate.rejected_at && (
                            <div className="text-sm">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Recusado em
                              </p>
                              <p>{dateFormatter.format(new Date(estimate.rejected_at))}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {estimate.notes && (
                        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                          {estimate.notes}
                        </div>
                      )}

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                Tipo
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                Descricao
                              </th>
                              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                Qtd.
                              </th>
                              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                Unitario
                              </th>
                              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {estimate.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {ESTIMATE_ITEM_TYPE_LABELS[
                                    item.item_type as keyof typeof ESTIMATE_ITEM_TYPE_LABELS
                                  ] ?? item.item_type}
                                </td>
                                <td className="px-3 py-2">
                                  <div>{item.description}</div>
                                  {item.notes && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">
                                  {currencyFormatter.format(item.unit_price)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {currencyFormatter.format(item.line_total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        ) : null}

        {showCreateForm ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {activeDraftEstimate
                  ? `Orcamento v${activeDraftEstimate.version} em rascunho`
                  : 'Novo orcamento'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canManageEstimates && (
                <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {serviceOrderStatus === 'aguardando_aprovacao'
                    ? 'Esta OS está aguardando a resposta do cliente. Aguarde aprovação ou recusa antes de editar ou criar outro orçamento.'
                    : serviceOrderStatus === 'aprovado'
                      ? 'Esta OS já possui orçamento aprovado. Continue o atendimento antes de abrir outro orçamento.'
                      : serviceOrderStatus === 'aguardando_peca'
                        ? 'Esta OS está aguardando peça. O orçamento já foi aprovado e não pode ser editado.'
                        : `Esta OS está ${serviceOrderStatus === 'cancelado' ? 'cancelada' : 'finalizada'}. Edição e emissão de novos orçamentos estão bloqueadas.`}
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Valido ate</Label>
                    <DatePicker
                      value={watchedValidUntil}
                      onChange={(date) => setValue('valid_until', date)}
                    />
                    {errors.valid_until && (
                      <p className="text-xs text-destructive">{errors.valid_until.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="estimate-warranty-days">Garantia</Label>
                    <Input
                      id="estimate-warranty-days"
                      type="number"
                      min="0"
                      step="1"
                      {...register('warranty_days', { valueAsNumber: true })}
                    />
                    {errors.warranty_days && (
                      <p className="text-xs text-destructive">{errors.warranty_days.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Itens do orcamento</h3>
                      <p className="text-sm text-muted-foreground">
                        Separe servicos, pecas ou ajustes avulsos em linhas distintas.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={!canManageEstimates}
                      onClick={() =>
                        append({
                          part_id: '',
                          item_type: 'servico',
                          description: '',
                          quantity: '1',
                          unit_price: '0',
                          notes: '',
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Adicionar item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const watchedItemType = normalizedWatchedItems[index]?.item_type || 'servico'
                      const currentDescription = normalizedWatchedItems[index]?.description || ''
                      const useCatalog = watchedItemType === 'servico' || watchedItemType === 'peca'

                      const catalogItems: CatalogItem[] =
                        watchedItemType === 'servico'
                          ? catalogServices.map((s) => ({ id: s.id, name: s.name, price: s.price }))
                          : watchedItemType === 'peca'
                            ? catalogParts.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: p.sale_price,
                              }))
                            : []

                      const currentPartId = normalizedWatchedItems[index]?.part_id ?? ''
                      const availableQty =
                        watchedItemType === 'peca' && currentPartId
                          ? (stockAvailability[currentPartId] ?? undefined)
                          : undefined
                      const requestedQty =
                        watchedItemType === 'servico'
                          ? 1
                          : toNumber(normalizedWatchedItems[index]?.quantity)
                      const stockInsufficient =
                        availableQty !== undefined && requestedQty > availableQty

                      return (
                        <div key={field.id} className="rounded-lg border p-4">
                          <div className="grid gap-4 xl:grid-cols-12">
                            <div className="space-y-1.5 xl:col-span-2">
                              <Label>Tipo</Label>
                              <Select
                                value={watchedItemType}
                                onValueChange={(value) => {
                                  setValue(
                                    `items.${index}.item_type`,
                                    value as ServiceOrderEstimateSchema['items'][number]['item_type']
                                  )
                                  setValue(`items.${index}.description`, '')
                                  setValue(`items.${index}.unit_price`, '0')
                                  setValue(`items.${index}.part_id`, '')
                                  setValue(`items.${index}.quantity`, '1')
                                }}
                              >
                                <SelectTrigger>
                                  <span>
                                    {
                                      ESTIMATE_ITEM_TYPE_LABELS[
                                        watchedItemType as keyof typeof ESTIMATE_ITEM_TYPE_LABELS
                                      ]
                                    }
                                  </span>
                                </SelectTrigger>
                                <SelectContent>
                                  {ESTIMATE_ITEM_TYPES.map((itemType) => (
                                    <SelectItem key={itemType} value={itemType}>
                                      {ESTIMATE_ITEM_TYPE_LABELS[itemType]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors.items?.[index]?.item_type && (
                                <p className="text-xs text-destructive">
                                  {errors.items[index]?.item_type?.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5 xl:col-span-5">
                              <Label>Descricao</Label>
                              {useCatalog ? (
                                <CatalogCombobox
                                  items={catalogItems}
                                  description={currentDescription}
                                  getAvailability={
                                    watchedItemType === 'peca'
                                      ? (partId) => stockAvailability[partId]
                                      : undefined
                                  }
                                  onSelect={(id, name, price) => {
                                    setValue(`items.${index}.description`, name)
                                    setValue(
                                      `items.${index}.part_id`,
                                      watchedItemType === 'peca' ? id : ''
                                    )
                                    if (price !== null) {
                                      setValue(
                                        `items.${index}.unit_price`,
                                        toMoneyInputValue(price)
                                      )
                                    }
                                  }}
                                />
                              ) : (
                                <Input
                                  id={`items.${index}.description`}
                                  placeholder="Ex: Taxa de visita, ajuste avulso"
                                  {...register(`items.${index}.description`)}
                                />
                              )}
                              {errors.items?.[index]?.description && (
                                <p className="text-xs text-destructive">
                                  {errors.items[index]?.description?.message}
                                </p>
                              )}
                            </div>

                            <div
                              className={
                                watchedItemType === 'servico'
                                  ? 'hidden'
                                  : 'space-y-1.5 xl:col-span-2'
                              }
                            >
                              <Label htmlFor={`items.${index}.quantity`}>Quantidade</Label>
                              <Input
                                id={`items.${index}.quantity`}
                                type="number"
                                min={watchedItemType === 'peca' ? '1' : '0.01'}
                                step={watchedItemType === 'peca' ? '1' : '0.01'}
                                inputMode={watchedItemType === 'peca' ? 'numeric' : 'decimal'}
                                onFocus={(e) => e.target.select()}
                                {...register(`items.${index}.quantity`)}
                              />
                              {errors.items?.[index]?.quantity && (
                                <p className="text-xs text-destructive">
                                  {errors.items[index]?.quantity?.message}
                                </p>
                              )}
                              {stockInsufficient && (
                                <p className="text-xs text-destructive">
                                  Disponível: {availableQty}
                                </p>
                              )}
                              {!stockInsufficient &&
                                availableQty !== undefined &&
                                availableQty <= 3 &&
                                availableQty > 0 && (
                                  <p className="text-xs text-amber-600">
                                    Estoque baixo: {availableQty} disp.
                                  </p>
                                )}
                            </div>

                            <div className="xl:col-span-2">
                              <Controller
                                control={control}
                                name={`items.${index}.unit_price`}
                                render={({ field }) => (
                                  <MaskedInputField
                                    mask="money"
                                    label="Valor unitario"
                                    placeholder="R$ 0,00"
                                    error={errors.items?.[index]?.unit_price?.message}
                                    {...field}
                                    value={field.value == null ? '' : String(field.value)}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                )}
                              />
                            </div>

                            <div className="flex items-end justify-end xl:col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1 || !canManageEstimates}
                                title="Remover item"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-1.5">
                    <Label htmlFor="estimate-notes">Observacoes do orcamento</Label>
                    <Textarea
                      id="estimate-notes"
                      rows={4}
                      placeholder="Ex: prazo sujeito a disponibilidade da peca, garantia de 90 dias."
                      {...register('notes')}
                    />
                    {errors.notes && (
                      <p className="text-xs text-destructive">{errors.notes.message}</p>
                    )}
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold">Resumo financeiro</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{currencyFormatter.format(previewSubtotal)}</span>
                      </div>

                      {showDiscount ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Desconto</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscount(false)
                                setValue('discount_amount', '0')
                              }}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              title="Remover desconto"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <Controller
                            control={control}
                            name="discount_amount"
                            render={({ field }) => (
                              <MaskedInputField
                                mask="money"
                                placeholder="R$ 0,00"
                                error={errors.discount_amount?.message}
                                {...field}
                                value={field.value == null ? '' : String(field.value)}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            )}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDiscount(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Plus className="size-3" />
                          Adicionar desconto
                        </button>
                      )}

                      <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                        <span>Total</span>
                        <span className="text-primary">
                          {currencyFormatter.format(previewTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    type="submit"
                    loading={isPending}
                    disabled={isPending || !canManageEstimates}
                  >
                    {activeDraftEstimate ? 'Salvar orçamento' : 'Criar orcamento'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  )
}
