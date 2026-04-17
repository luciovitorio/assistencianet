'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  Cpu,
  Plus,
  Search,
  ShieldCheck,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createServiceOrder, editServiceOrder } from '@/app/actions/service-orders'
import { ClientDialog } from '@/app/dashboard/clientes/_components/client-dialog'
import {
  serviceOrderSchema,
  editServiceOrderSchema,
  type ServiceOrderSchema,
} from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'

const CONTROL = 'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'
const AREA = 'rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

export interface ClientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
}

export interface BranchOption {
  id: string
  name: string
}

export interface EmployeeOption {
  id: string
  name: string
  role: string
}

const mergeClientsById = (...groups: ClientOption[][]) =>
  Array.from(new Map(groups.flat().map((client) => [client.id, client])).values())

interface ClientSearchInputProps {
  clients: ClientOption[]
  value: string
  onChange: (clientId: string) => void
  onClientCreated: (client: ClientOption) => void
  error?: string
  branches: BranchOption[]
  defaultBranchId: string | null
}

function ClientSearchInput({
  clients,
  value,
  onChange,
  onClientCreated,
  error,
  branches,
  defaultBranchId,
}: ClientSearchInputProps) {
  const [search, setSearch] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedClient = React.useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value],
  )

  const filteredClients = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return clients.slice(0, 8)
    return clients
      .filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          (client.phone ?? '').toLowerCase().includes(query) ||
          (client.document ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, '')),
      )
      .slice(0, 10)
  }, [clients, search])

  const updatePosition = React.useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 })
  }, [])

  React.useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) return
    const sync = () => updatePosition()
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [isOpen, updatePosition])

  const displayValue = selectedClient ? selectedClient.name : search

  const dropdown =
    isOpen && typeof window !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="overflow-hidden rounded-xl bg-popover ring-1 ring-foreground/10 shadow-xl shadow-slate-950/10"
          >
            <div className="max-h-64 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {search.trim()
                    ? `Nenhum cliente encontrado para "${search}".`
                    : 'Nenhum cliente cadastrado.'}
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onChange(client.id)
                      setSearch('')
                      setIsOpen(false)
                    }}
                  >
                    <span>
                      <span className="font-medium">{client.name}</span>
                      {client.phone && <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>}
                    </span>
                    {value === client.id && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                ))
              )}
            </div>
            <div className="border-t">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                onMouseDown={(event) => {
                  event.preventDefault()
                  setIsOpen(false)
                  setShowCreateDialog(true)
                }}
              >
                <Plus className="size-4 shrink-0" />
                {search.trim() ? `Cadastrar "${search.trim()}" como novo cliente` : 'Cadastrar novo cliente'}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div
          className={cn(
            'relative flex h-11 items-center rounded-xl border bg-background shadow-sm shadow-slate-950/5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            error ? 'border-destructive ring-3 ring-destructive/20' : 'border-input',
          )}
        >
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(event) => {
              setSearch(event.target.value)
              if (value) onChange('')
              if (!isOpen) {
                updatePosition()
                setIsOpen(true)
              }
            }}
            onFocus={() => {
              updatePosition()
              setIsOpen(true)
            }}
            placeholder="Buscar pelo nome, telefone ou CPF/CNPJ..."
            className="flex-1 bg-transparent py-1 pl-10 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            autoComplete="off"
          />
          {(selectedClient || search) && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
                setSearch('')
                setIsOpen(false)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              className="absolute right-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {dropdown}

      <ClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        branches={branches}
        defaultOriginBranchId={defaultBranchId}
        client={search.trim() ? { name: search.trim() } : undefined}
        onSuccess={(created) => {
          const newClient = {
            id: created.id,
            name: created.name,
            phone: created.phone || null,
            document: created.document || null,
          }
          onClientCreated(newClient)
          onChange(created.id)
          setSearch('')
        }}
      />
    </>
  )
}

export interface ServiceOrderInitialData {
  id: string
  number: number
  status: string
  branch_id: string
  client_id: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  device_serial: string | null
  device_condition: string | null
  reported_issue: string
  technician_id: string | null
  estimated_delivery: string | null
  notes: string | null
}

interface ServiceOrderFormProps {
  branches: BranchOption[]
  clients: ClientOption[]
  employees: EmployeeOption[]
  deviceTypes: string[]
  defaultBranchId: string | null
  defaultBranchName?: string | null
  nextNumber?: number
  initialData?: ServiceOrderInitialData
  isAdmin?: boolean
}

export function ServiceOrderForm({
  branches,
  clients,
  employees,
  deviceTypes,
  defaultBranchId,
  defaultBranchName,
  nextNumber,
  initialData,
  isAdmin = true,
}: ServiceOrderFormProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const isEdit = !!initialData
  const [isPending, startTransition] = React.useTransition()
  const [isNavigatingAway, setIsNavigatingAway] = React.useState(false)
  const [extraClients, setExtraClients] = React.useState<ClientOption[]>([])
  const allClients = React.useMemo(
    () => mergeClientsById(clients, extraClients),
    [clients, extraClients],
  )
  const technicians = employees.filter((employee) => employee.role === 'tecnico')
  const num = isEdit && initialData ? initialData.number : (nextNumber || 0)
  const osDisplayNumber = `${String(num).slice(0, 4)}-${String(num).slice(4).padStart(4, '0')}`

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceOrderSchema>({
    resolver: zodResolver(isEdit ? editServiceOrderSchema : serviceOrderSchema) as unknown as Resolver<ServiceOrderSchema>,
    defaultValues: initialData
      ? {
          branch_id: initialData.branch_id,
          client_id: initialData.client_id,
          device_type: initialData.device_type,
          device_brand: initialData.device_brand || '',
          device_model: initialData.device_model || '',
          device_serial: initialData.device_serial || '',
          device_condition: initialData.device_condition || '',
          reported_issue: initialData.reported_issue || '',
          technician_id: initialData.technician_id || '',
          estimated_delivery: initialData.estimated_delivery
            ? new Date(initialData.estimated_delivery).toISOString()
            : '',
          notes: initialData.notes || '',
        }
      : {
          branch_id: defaultBranchId || '',
          client_id: '',
          device_type: undefined,
          device_brand: '',
          device_model: '',
          device_serial: '',
          device_condition: '',
          reported_issue: '',
          technician_id: '',
          estimated_delivery: '',
          notes: '',
        },
  })

  const onSubmit = (data: ServiceOrderSchema) => {
    if (isPending || isNavigatingAway) return
    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          const result = await editServiceOrder(initialData.id, data)
          if (result?.error) throw new Error(result.error)
          toast.success(`OS #${num} atualizada com sucesso.`)
          setIsNavigatingAway(true)
          navigate(`/dashboard/ordens-de-servico/${initialData.id}`)
          router.refresh()
        } else {
          const result = await createServiceOrder(data)
          if (result?.error) throw new Error(result.error)
          setIsNavigatingAway(true)
          navigate(`/dashboard/ordens-de-servico/${result.id}`)
        }
      } catch (error: unknown) {
        toast.error((error as Error).message || `Ocorreu um erro ao ${isEdit ? 'atualizar' : 'abrir'} a OS.`)
      }
    })
  }

  const isBusy = isPending || isNavigatingAway

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(15,118,110,0.06),rgba(255,255,255,1))] p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/ordens-de-servico"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'mt-0.5 shrink-0 bg-background')}
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">Voltar</span>
            </Link>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isEdit ? 'Edição de ordem de serviço' : 'Abertura de ordem de serviço'}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950">{isEdit ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <ShieldCheck className="size-3.5" />
                    {isEdit ? 'Em edição' : 'Em abertura'}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {isEdit ? 'Edite as informações da ordem de serviço. Lembre-se que certas alterações podem não estar disponíveis dependendo do status atual da OS.' : 'Registre o atendimento, identifique o equipamento e descreva o problema inicial com clareza. A OS aberta aqui sera a base para diagnostico, orcamento e execucao.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5"><Building2 className="size-4 text-teal-700" />Atendimento e origem</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5"><Cpu className="size-4 text-teal-700" />Identificacao do equipamento</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5"><Wrench className="size-4 text-teal-700" />Descricao tecnica inicial</div>
              </div>
            </div>
          </div>
          <div className="min-w-72 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-slate-50 shadow-lg shadow-slate-950/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Numero da OS</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-cyan-300">#{osDisplayNumber}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs uppercase tracking-wider text-slate-400">Fluxo</p><p className="mt-1 font-medium text-white">Abertura inicial</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs uppercase tracking-wider text-slate-400">Destino</p><p className="mt-1 font-medium text-white">OS detalhada</p></div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900"><Building2 className="size-4 text-teal-700" />Atendimento</CardTitle>
              <CardDescription>Defina a origem do atendimento e vincule o cliente correto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-slate-800">Filial *</Label>
                <Controller
                  control={control}
                  name="branch_id"
                  render={({ field }) => {
                    const selected = branches.find((branch) => branch.id === field.value)
                    if (!isAdmin) {
                      return (
                        <div className="flex h-11 items-center rounded-xl border border-input bg-muted/50 px-3 text-sm text-foreground/70 cursor-not-allowed">
                          {selected?.name ?? defaultBranchName ?? '—'}
                        </div>
                      )
                    }
                    return (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(CONTROL, errors.branch_id && 'border-destructive')}>
                          <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                            {selected ? selected.name : 'Selecione a filial'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
                {errors.branch_id && <p className="mt-1 text-xs text-destructive">{errors.branch_id.message}</p>}
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-slate-800">Cliente *</Label>
                <Controller
                  control={control}
                  name="client_id"
                  render={({ field }) => (
                    isEdit ? (
                      <div className="flex h-11 items-center rounded-xl border border-input bg-muted/50 px-3 text-sm text-foreground/70 opacity-80 cursor-not-allowed">
                        {allClients.find((c) => c.id === field.value)?.name || 'Cliente'}
                      </div>
                    ) : (
                      <ClientSearchInput
                        clients={allClients}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onClientCreated={(client) =>
                          setExtraClients((prev) => mergeClientsById(prev, [client]))
                        }
                        error={errors.client_id?.message}
                        branches={branches}
                        defaultBranchId={defaultBranchId}
                      />
                    )
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900"><CalendarClock className="size-4 text-teal-700" />Operacao</CardTitle>
              <CardDescription>Organize previsao e tecnico responsavel pela entrada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Controller
                control={control}
                name="estimated_delivery"
                render={({ field }) => (
                  <DatePickerField
                    label="Previsão de entrega"
                    placeholder="Selecione a data prevista"
                    error={errors.estimated_delivery?.message}
                    className={CONTROL}
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-slate-800">Técnico responsável</Label>
                <Controller
                  control={control}
                  name="technician_id"
                  render={({ field }) => {
                    const selected = technicians.find((technician) => technician.id === field.value)
                    return (
                      <Select value={field.value || ''} onValueChange={(selectedValue) => field.onChange(selectedValue === '__none' ? '' : selectedValue)}>
                        <SelectTrigger className={cn(CONTROL, errors.technician_id && 'border-destructive')}>
                          <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                            {selected ? selected.name : 'Sem técnico atribuído'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Sem técnico atribuído</SelectItem>
                          {technicians.map((technician) => (
                            <SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 size-4 text-slate-500" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">{isEdit ? 'Salvando alterações' : 'Antes de abrir a OS'}</p>
                <p className="text-sm leading-6 text-slate-600">{isEdit ? 'As alterações ficarão registradas no histórico da OS e estarão visíveis na linha do tempo.' : 'Confirme cliente, filial e identificacao do equipamento. Quanto melhor a entrada, mais confiavel sera o historico tecnico e comercial.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900"><Cpu className="size-4 text-teal-700" />Detalhes do equipamento</CardTitle>
              <CardDescription>Identifique com precisao o equipamento de salão que esta entrando na bancada.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-800">Tipo *</Label>
                  <Controller
                    control={control}
                    name="device_type"
                    render={({ field }) => {
                      const selected = field.value || undefined
                      return (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(CONTROL, errors.device_type && 'border-destructive')}>
                            <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                              {selected || 'Selecione o tipo'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {deviceTypes.map((deviceType) => (
                              <SelectItem key={deviceType} value={deviceType}>{deviceType}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    }}
                  />
                  {errors.device_type && <p className="mt-1 text-xs text-destructive">{errors.device_type.message}</p>}
                </div>
                <Controller control={control} name="device_brand" render={({ field }) => <InputField label="Marca" placeholder="Ex: Taiff, Babyliss, Wahl" error={errors.device_brand?.message} className={CONTROL} {...field} value={field.value || ''} />} />
                <Controller control={control} name="device_model" render={({ field }) => <InputField label="Modelo" placeholder="Ex: Vulcan, Nano Titanium, Magic Clip" error={errors.device_model?.message} className={CONTROL} {...field} value={field.value || ''} />} />
                <Controller control={control} name="device_serial" render={({ field }) => <InputField label="Série / Patrimônio" placeholder="Ex: NS-001245 ou etiqueta interna" error={errors.device_serial?.message} className={CONTROL} {...field} value={field.value || ''} />} />
                <div className="sm:col-span-2 xl:col-span-4">
                  <Controller
                    control={control}
                    name="device_condition"
                    render={({ field }) => (
                      <InputField
                        label="Condição de entrada"
                        helper="Registre avarias visiveis, acessorios ausentes e observacoes relevantes."
                        placeholder="Ex: Cabo ressecado, resistencia queimada, sem suporte"
                        error={errors.device_condition?.message}
                        className={CONTROL}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900"><Wrench className="size-4 text-teal-700" />Descrição do serviço</CardTitle>
              <CardDescription>Registre o relato do cliente e as observacoes iniciais para a equipe tecnica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800">Problema relatado pelo cliente *</Label>
                <Controller
                  control={control}
                  name="reported_issue"
                  render={({ field }) => (
                    <>
                      <Textarea
                        placeholder="Descreva o defeito informado pelo cliente, o comportamento do equipamento e qualquer sintoma relevante."
                        className={cn(AREA, 'min-h-36', errors.reported_issue && 'border-destructive')}
                        rows={5}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.reported_issue && <p className="text-xs text-destructive">{errors.reported_issue.message}</p>}
                    </>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><User className="size-4 text-slate-500" />Observações internas</Label>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <>
                      <Textarea
                        placeholder="Inclua observacoes tecnicas, contexto de atendimento ou restricoes combinadas com o cliente."
                        className={cn(AREA, 'min-h-28', errors.notes && 'border-destructive')}
                        rows={4}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
                    </>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{isEdit ? 'Pronto para salvar' : 'Pronto para abrir a OS'}</p>
                <p className="text-sm text-slate-600">{isEdit ? 'Verifique as alterações antes de salvar.' : 'A ordem sera criada e voce sera levado direto para a visao detalhada da OS.'}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={isEdit && initialData ? `/dashboard/ordens-de-servico/${initialData.id}` : "/dashboard/ordens-de-servico"} className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl')}>Cancelar</Link>
                <Button type="submit" disabled={isBusy} loading={isBusy} className="rounded-xl bg-slate-950 px-5 hover:bg-slate-800">
                  {isEdit ? 'Salvar Alterações' : 'Abrir OS'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
