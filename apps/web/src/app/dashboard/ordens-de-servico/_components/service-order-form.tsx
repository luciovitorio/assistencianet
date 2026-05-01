'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Building2,
  ChevronRight,
  Cpu,
  Info,
  MessageSquare,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { InputField } from '@/components/ui/input-field'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { SearchAutocomplete } from '@/components/ui/search-autocomplete'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { searchClientsForServiceOrder } from '@/app/actions/clients'
import { searchEquipmentModelsForServiceOrder } from '@/app/actions/equipments'
import {
  createServiceOrder,
  editServiceOrder,
  getClientActiveWarranties,
  type ActiveWarrantyOS,
} from '@/app/actions/service-orders'
import { ClientDialog } from '@/app/dashboard/clientes/_components/client-dialog'
import { EquipmentDialog } from '@/app/dashboard/equipamentos/_components/equipment-dialog'
import { PrintServiceOrderDialog } from './print-service-order-dialog'
import { useHeaderSlot } from '@/app/dashboard/_components/header-slot'
import {
  serviceOrderSchema,
  editServiceOrderSchema,
  type ServiceOrderSchema,
} from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'

const CONTROL = 'h-9 rounded-md border-slate-200 bg-white placeholder:text-slate-400/70 shadow-none'
const AREA = 'rounded-md border-slate-200 bg-white placeholder:text-slate-400/70 shadow-none'

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
  is_owner?: boolean
}

export interface EquipmentOption {
  id: string
  type: string
  manufacturer: string
  model: string
  voltage: string | null
}

export interface ServiceOrderUsage {
  used: number
  limit: number | null
  reached: boolean
  planName: string | null
}

const mergeClientsById = (...groups: ClientOption[][]) =>
  Array.from(new Map(groups.flat().map((client) => [client.id, client])).values())

const formatOsNumber = (num: number) =>
  `${String(num).slice(0, 4)}-${String(num).slice(4).padStart(4, '0')}`

const normalizeAutocompleteSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

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
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [newClientName, setNewClientName] = React.useState('')
  const searchClients = React.useCallback(async (search: string) => {
    const result = await searchClientsForServiceOrder(search)

    if ('error' in result) {
      toast.error(result.error)
      return []
    }

    return result.clients
  }, [])

  return (
    <>
      <SearchAutocomplete
        options={clients}
        value={value}
        onChange={onChange}
        onSelectOption={onClientCreated}
        placeholder="Buscar pelo nome, telefone ou CPF/CNPJ..."
        error={error}
        getOptionLabel={(client) => client.name}
        getOptionSearchText={(client) => [client.name, client.phone, client.document].filter(Boolean).join(' ')}
        filterOption={(client, query) => {
          const nameMatches = normalizeAutocompleteSearch(client.name)
            .split(/\s+/)
            .some((namePart) => namePart.startsWith(query))
          const numericQuery = query.replace(/\D/g, '')

          if (!numericQuery) return nameMatches

          return nameMatches || [client.phone, client.document]
            .filter(Boolean)
            .some((value) => value!.replace(/\D/g, '').includes(numericQuery))
        }}
        searchOptions={searchClients}
        renderOption={(client) => (
          <>
            <span className="font-medium">{client.name}</span>
            {client.phone && <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>}
          </>
        )}
        emptyMessage={(search) =>
          search.trim()
            ? `Nenhum cliente encontrado para "${search}".`
            : 'Nenhum cliente cadastrado.'
        }
        createLabel={() => 'Cadastrar novo cliente'}
        onCreate={(search) => {
          setNewClientName(search.trim())
          setShowCreateDialog(true)
        }}
      />

      <ClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        branches={branches}
        defaultOriginBranchId={defaultBranchId}
        client={newClientName ? { name: newClientName } : undefined}
        onSuccess={(created) => {
          const newClient = {
            id: created.id,
            name: created.name,
            phone: created.phone || null,
            document: created.document || null,
          }
          onClientCreated(newClient)
          onChange(created.id)
          setNewClientName('')
        }}
      />
    </>
  )
}

interface EquipmentSearchInputProps {
  equipments: EquipmentOption[]
  value: string
  onChange: (equipmentId: string) => void
  onEquipmentCreated: (equipment: EquipmentOption) => void
  error?: string
}

function EquipmentSearchInput({
  equipments,
  value,
  onChange,
  onEquipmentCreated,
  error,
}: EquipmentSearchInputProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const formatEquipment = React.useCallback(
    (equipment: EquipmentOption) =>
      `${equipment.type} · ${equipment.manufacturer} ${equipment.model}${
        equipment.voltage ? ` · ${equipment.voltage}` : ''
      }`,
    [],
  )
  const searchEquipments = React.useCallback(async (search: string) => {
    const result = await searchEquipmentModelsForServiceOrder(search)

    if ('error' in result) {
      toast.error(result.error)
      return []
    }

    return result.equipments
  }, [])

  return (
    <>
      <SearchAutocomplete
        options={equipments}
        value={value}
        onChange={onChange}
        onSelectOption={onEquipmentCreated}
        placeholder="Buscar por tipo, fabricante, modelo ou voltagem..."
        error={error}
        getOptionLabel={formatEquipment}
        getOptionSearchText={(equipment) =>
          [equipment.type, equipment.manufacturer, equipment.model, equipment.voltage]
            .filter(Boolean)
            .join(' ')
        }
        searchOptions={searchEquipments}
        renderOption={(equipment) => (
          <>
            <span className="font-medium">{equipment.type}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {equipment.manufacturer} {equipment.model}
              {equipment.voltage ? ` · ${equipment.voltage}` : ''}
            </span>
          </>
        )}
        emptyMessage={(search) =>
          search.trim()
            ? `Nenhum equipamento encontrado para "${search}".`
            : 'Nenhum equipamento cadastrado.'
        }
        createLabel={() => 'Cadastrar novo equipamento'}
        onCreate={() => setShowCreateDialog(true)}
      />

      <EquipmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(created) => {
          onEquipmentCreated(created)
          onChange(created.id)
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
  equipment_model_id: string | null
  device_type: string
  device_brand: string | null
  device_model: string | null
  device_serial: string | null
  device_color: string | null
  device_internal_code: string | null
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
  equipments: EquipmentOption[]
  defaultBranchId: string | null
  defaultBranchName?: string | null
  nextNumber?: number
  initialData?: ServiceOrderInitialData
  isAdmin?: boolean
  serviceOrderUsage?: ServiceOrderUsage
}

export function ServiceOrderForm({
  branches,
  clients,
  employees,
  equipments,
  defaultBranchId,
  defaultBranchName,
  nextNumber,
  initialData,
  isAdmin = true,
  serviceOrderUsage,
}: ServiceOrderFormProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const isEdit = !!initialData
  const [isPending, startTransition] = React.useTransition()
  const [isNavigatingAway, setIsNavigatingAway] = React.useState(false)
  const [extraClients, setExtraClients] = React.useState<ClientOption[]>([])
  const [extraEquipments, setExtraEquipments] = React.useState<EquipmentOption[]>([])
  const [pendingPrint, setPendingPrint] = React.useState<{
    id: string
    number: number
    clientName: string | null
  } | null>(null)
  const allClients = React.useMemo(
    () => mergeClientsById(clients, extraClients),
    [clients, extraClients],
  )
  const allEquipments = React.useMemo(
    () => Array.from(new Map([...equipments, ...extraEquipments].map((equipment) => [equipment.id, equipment])).values()),
    [equipments, extraEquipments],
  )
  const technicians = employees.filter((employee) => employee.role === 'tecnico' || employee.is_owner)
  const num = isEdit && initialData ? initialData.number : (nextNumber || 0)
  const osDisplayNumber = `${String(num).slice(0, 4)}-${String(num).slice(4).padStart(4, '0')}`
  const showUpgradeNotice = !isEdit && Boolean(serviceOrderUsage?.reached)

  const headerConfig = React.useMemo(() => ({
    backHref: '/dashboard/ordens-de-servico',
    backLabel: 'Ordens de Serviço',
    title: isEdit ? 'Editar OS' : 'Nova OS',
    badge: isEdit ? 'Em edição' : 'Em abertura',
    osNumber: osDisplayNumber,
  }), [isEdit, osDisplayNumber])
  useHeaderSlot(headerConfig)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ServiceOrderSchema>({
    resolver: zodResolver(isEdit ? editServiceOrderSchema : serviceOrderSchema) as unknown as Resolver<ServiceOrderSchema>,
    defaultValues: initialData
      ? {
          branch_id: initialData.branch_id,
          client_id: initialData.client_id,
          equipment_model_id: initialData.equipment_model_id || '',
          device_type: initialData.device_type,
          device_brand: initialData.device_brand || '',
          device_model: initialData.device_model || '',
          device_serial: initialData.device_serial || '',
          device_color: initialData.device_color || '',
          device_internal_code: initialData.device_internal_code || '',
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
          equipment_model_id: '',
          device_type: undefined,
          device_brand: '',
          device_model: '',
          device_serial: '',
          device_color: '',
          device_internal_code: '',
          device_condition: '',
          reported_issue: '',
          technician_id: '',
          estimated_delivery: '',
          notes: '',
        },
  })

  const selectedEquipmentId = useWatch({
    control,
    name: 'equipment_model_id',
  })
  const selectedEquipment = React.useMemo(
    () => allEquipments.find((equipment) => equipment.id === selectedEquipmentId) ?? null,
    [allEquipments, selectedEquipmentId],
  )

  React.useEffect(() => {
    if (!selectedEquipment) return
    setValue('device_type', selectedEquipment.type, { shouldValidate: true, shouldDirty: true })
    setValue('device_brand', selectedEquipment.manufacturer, { shouldValidate: true, shouldDirty: true })
    setValue('device_model', selectedEquipment.model, { shouldValidate: true, shouldDirty: true })
  }, [selectedEquipment, setValue])

  // ── Retrabalho em garantia ─────────────────────────────────────────
  const selectedClientId = useWatch({ control, name: 'client_id' })
  const [activeWarranties, setActiveWarranties] = React.useState<ActiveWarrantyOS[]>([])
  const [linkedParent, setLinkedParent] = React.useState<ActiveWarrantyOS | null>(null)

  React.useEffect(() => {
    if (isEdit || !selectedClientId) {
      setActiveWarranties([])
      return
    }
    let cancelled = false
    getClientActiveWarranties(selectedClientId).then((result) => {
      if (!cancelled) setActiveWarranties(result)
    })
    return () => {
      cancelled = true
    }
  }, [selectedClientId, isEdit])

  const linkAsWarrantyRework = (os: ActiveWarrantyOS) => {
    setLinkedParent(os)
    setValue('parent_service_order_id', os.id)
    setValue('is_warranty_rework', true)
    if (os.equipment_model_id) {
      setValue('equipment_model_id', os.equipment_model_id, { shouldValidate: true })
    }
    if (os.device_type) setValue('device_type', os.device_type)
    if (os.device_brand) setValue('device_brand', os.device_brand)
    if (os.device_model) setValue('device_model', os.device_model)
    if (os.device_serial) setValue('device_serial', os.device_serial)
    if (os.device_internal_code) setValue('device_internal_code', os.device_internal_code)
    toast.success(
      `Vinculado como retrabalho em garantia da OS #${formatOsNumber(os.number)}.`,
    )
  }

  const unlinkWarrantyRework = () => {
    setLinkedParent(null)
    setValue('parent_service_order_id', '')
    setValue('is_warranty_rework', false)
  }

  const onSubmit = (data: ServiceOrderSchema) => {
    if (isPending || isNavigatingAway || pendingPrint) return
    if (showUpgradeNotice) {
      toast.error('Faça upgrade para o plano Profissional para abrir novas OS neste mês.')
      return
    }

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
          if (result?.error || !result?.id || result.number == null) {
            throw new Error(result?.error ?? 'Erro ao abrir ordem de serviço')
          }
          toast.success(`OS #${result.number} criada com sucesso.`)
          const clientName =
            allClients.find((client) => client.id === data.client_id)?.name ?? null
          setPendingPrint({ id: result.id, number: result.number, clientName })
        }
      } catch (error: unknown) {
        toast.error((error as Error).message || `Ocorreu um erro ao ${isEdit ? 'atualizar' : 'abrir'} a OS.`)
      }
    })
  }

  const isBusy = isPending || isNavigatingAway || !!pendingPrint

  const handlePrintDialogClose = () => {
    if (!pendingPrint) return
    const targetId = pendingPrint.id
    setPendingPrint(null)
    setIsNavigatingAway(true)
    navigate(`/dashboard/ordens-de-servico/${targetId}`)
  }

  return (
    <div className="space-y-5">
      {pendingPrint && (
        <PrintServiceOrderDialog
          open
          onClose={handlePrintDialogClose}
          serviceOrderId={pendingPrint.id}
          serviceOrderNumber={pendingPrint.number}
          clientName={pendingPrint.clientName}
        />
      )}

      {/* ── Page header ── */}
      <div className="pb-5 mb-5 border-b border-slate-200">
        {/* Large OS number + info badges + flow indicator */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-[22px] font-extrabold tracking-tight text-slate-900">
            #{osDisplayNumber}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Building2 className="size-3 text-slate-400" />
              Atendimento e origem
            </span>
            <span className="text-[11px] text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Cpu className="size-3 text-slate-400" />
              Identificação do equipamento
            </span>
            <span className="text-[11px] text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <MessageSquare className="size-3 text-slate-400" />
              Descrição técnica inicial
            </span>
          </div>
          <div className="ml-auto hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="font-semibold text-primary">Abertura inicial</span>
            <ChevronRight className="size-3 text-slate-300" />
            <span>OS detalhada</span>
          </div>
        </div>
      </div>

      {/* ── Upgrade notice ── */}
      {showUpgradeNotice && serviceOrderUsage && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <ShieldAlert className="size-4" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Limite mensal de OS atingido
            <Badge variant="outline" className="border-amber-300 bg-white text-amber-800">
              Upgrade para Profissional
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            O plano {serviceOrderUsage.planName ?? 'atual'} permite {serviceOrderUsage.limit} OS por mês
            e já existem {serviceOrderUsage.used} neste mês. Para abrir novas ordens de serviço,
            acesse{' '}
            <Link href="/dashboard/assinatura" className="font-medium underline underline-offset-4">
              Assinatura
            </Link>
            {' '}e altere para o plano Profissional.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Form card ── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col xl:flex-row border border-slate-200 rounded-xl bg-white shadow-sm shadow-slate-950/5 overflow-hidden"
      >

        {/* ──────────── LEFT SIDEBAR ──────────── */}
        <div className="xl:w-64 xl:shrink-0 xl:border-r border-b xl:border-b-0 border-slate-200">

          {/* Atendimento section */}
          <div className="px-5 pt-5 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3.5">
              Atendimento
            </p>

            {/* Filial */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Filial <span className="text-primary">*</span>
              </label>
              <Controller
                control={control}
                name="branch_id"
                render={({ field }) => {
                  const selected = branches.find((branch) => branch.id === field.value)
                  if (!isAdmin) {
                    return (
                      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-muted/50 px-3 text-[13px] text-slate-500 cursor-not-allowed">
                        {selected?.name ?? defaultBranchName ?? '—'}
                      </div>
                    )
                  }
                  return (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(CONTROL, errors.branch_id && 'border-destructive')}>
                        <span className={cn('text-[13px]', field.value ? 'text-slate-800' : 'text-slate-400')}>
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
              {errors.branch_id && (
                <p className="mt-1 text-xs text-destructive">{errors.branch_id.message}</p>
              )}
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Cliente <span className="text-primary">*</span>
              </label>
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  isEdit ? (
                    <div className="flex h-9 items-center rounded-md border border-slate-200 bg-muted/50 px-3 text-[13px] text-slate-500 cursor-not-allowed">
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
              {!isEdit && (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Digite nome, telefone ou CPF para buscar
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Operação section */}
          <div className="px-5 pt-5 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3.5">
              Operação
            </p>

            {/* Previsão de entrega */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Previsão de entrega
              </label>
              <Controller
                control={control}
                name="estimated_delivery"
                render={({ field }) => (
                  <DatePickerField
                    placeholder="Selecione a data prevista"
                    error={errors.estimated_delivery?.message}
                    className={CONTROL}
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Técnico responsável */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Técnico responsável
              </label>
              <Controller
                control={control}
                name="technician_id"
                render={({ field }) => {
                  const selected = technicians.find((technician) => technician.id === field.value)
                  return (
                    <Select
                      value={field.value || ''}
                      onValueChange={(selectedValue) =>
                        field.onChange(selectedValue === '__none' ? '' : selectedValue)
                      }
                    >
                      <SelectTrigger className={cn(CONTROL, errors.technician_id && 'border-destructive')}>
                        <span className={cn('text-[13px]', field.value ? 'text-slate-800' : 'text-slate-400')}>
                          {selected ? selected.name : 'Sem técnico designado'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Sem técnico designado</SelectItem>
                        {technicians.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id}>
                            {technician.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Tip box */}
          <div className="p-4">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="size-3 text-slate-400" />
                <p className="text-[11px] font-bold text-slate-600">
                  {isEdit ? 'Salvando alterações' : 'Abertura inicial'}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isEdit
                  ? 'As alterações ficarão registradas no histórico da OS e estarão visíveis na linha do tempo.'
                  : 'Preencha o mínimo para registrar a entrada. Diagnóstico, orçamento e peças são adicionados depois na OS completa.'}
              </p>
            </div>
          </div>
        </div>

        {/* ──────────── RIGHT: MAIN CONTENT + FOOTER ──────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-6 space-y-8">

            {/* Warranty / rework alerts */}
            {!isEdit && (linkedParent || activeWarranties.length > 0) && (
              <div>
                {linkedParent ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
                    <ShieldCheck className="mt-0.5 size-3.75 shrink-0 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-900">
                        Retrabalho em garantia vinculado à OS #{formatOsNumber(linkedParent.number)}
                      </p>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        {[linkedParent.device_type, linkedParent.device_brand, linkedParent.device_model]
                          .filter(Boolean)
                          .join(' ')}
                        {' · Garantia até '}
                        {new Date(linkedParent.warranty_expires_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={unlinkWarrantyRework}
                      className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 -my-0.5 h-7"
                    >
                      <X className="size-3.5" />
                      Desvincular
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                    <ShieldAlert className="mt-0.5 size-3.75 shrink-0 text-amber-600" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-xs font-bold text-amber-900">
                        Este cliente tem {activeWarranties.length}{' '}
                        {activeWarranties.length === 1 ? 'OS' : 'OSs'} em garantia ativa
                      </p>
                      <p className="text-xs text-amber-800">
                        Se for retrabalho, vincule à OS original para não gerar nova cobrança.
                      </p>
                      <ul className="space-y-1.5 pt-0.5">
                        {activeWarranties.map((os) => (
                          <li
                            key={os.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-semibold text-amber-900">
                                #{formatOsNumber(os.number)}
                              </span>
                              <span className="ml-2 text-foreground">
                                {[os.device_type, os.device_brand, os.device_model]
                                  .filter(Boolean)
                                  .join(' ')}
                              </span>
                              {os.device_internal_code && (
                                <span className="ml-2 text-muted-foreground">
                                  cód. {os.device_internal_code}
                                </span>
                              )}
                              <span className="ml-2 text-muted-foreground">
                                até{' '}
                                {new Date(os.warranty_expires_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => linkAsWarrantyRework(os)}
                              className="border-amber-400 text-amber-900 hover:bg-amber-100 text-xs h-7"
                            >
                              Vincular como retrabalho
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Detalhes do equipamento ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="size-3.5 text-slate-400" strokeWidth={2} />
                <h3 className="text-[13px] font-bold text-slate-800">Detalhes do equipamento</h3>
              </div>
              <div className="h-px bg-slate-100 mb-4" />

              {/* Equipment search */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Equipamento <span className="text-primary">*</span>
                </label>
                <Controller
                  control={control}
                  name="equipment_model_id"
                  render={({ field }) => {
                    if (linkedParent) {
                      const eq = allEquipments.find((e) => e.id === field.value)
                      return (
                        <div className={cn(CONTROL, 'flex items-center bg-muted/50 px-3 text-[13px] text-slate-500 cursor-not-allowed')}>
                          {eq
                            ? `${eq.type} · ${eq.manufacturer} ${eq.model}${eq.voltage ? ` · ${eq.voltage}` : ''}`
                            : selectedEquipment
                              ? `${selectedEquipment.type} · ${selectedEquipment.manufacturer} ${selectedEquipment.model}`
                              : '—'}
                        </div>
                      )
                    }
                    return (
                      <EquipmentSearchInput
                        equipments={allEquipments}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onEquipmentCreated={(created) =>
                          setExtraEquipments((prev) =>
                            Array.from(
                              new Map([...prev, created].map((equipment) => [equipment.id, equipment])).values(),
                            ),
                          )
                        }
                        error={errors.equipment_model_id?.message}
                      />
                    )
                  }}
                />
              </div>

              {/* 4-col read-only display grid */}
              <div className="grid grid-cols-4 divide-x divide-slate-200 border border-slate-200 rounded-lg overflow-hidden my-3.5">
                {[
                  { label: 'Tipo', value: selectedEquipment?.type || initialData?.device_type },
                  { label: 'Fabricante', value: selectedEquipment?.manufacturer || initialData?.device_brand },
                  { label: 'Modelo', value: selectedEquipment?.model || initialData?.device_model },
                  { label: 'Voltagem', value: selectedEquipment?.voltage },
                ].map((field) => (
                  <div key={field.label} className="px-3.5 py-2.5 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-0.5 truncate">
                      {field.label}
                    </p>
                    <p className={cn(
                      'text-[13px] font-medium truncate',
                      field.value ? 'text-slate-700' : 'text-slate-300 italic font-normal',
                    )}>
                      {field.value || '—'}
                    </p>
                  </div>
                ))}
              </div>

              {/* 3-col: Cor / N° série / Código */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Cor</label>
                  <Controller
                    control={control}
                    name="device_color"
                    render={({ field }) => (
                      <InputField
                        placeholder="Ex: Space Black"
                        error={errors.device_color?.message}
                        className={CONTROL}
                        {...field}
                        value={field.value || ''}
                        disabled={!!linkedParent}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Número de série
                  </label>
                  <Controller
                    control={control}
                    name="device_serial"
                    render={({ field }) => (
                      <InputField
                        placeholder="S/N ou IMEI"
                        error={errors.device_serial?.message}
                        className={cn(CONTROL, 'font-mono text-[12px]')}
                        {...field}
                        value={field.value || ''}
                        disabled={!!linkedParent}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Código / etiqueta
                  </label>
                  <Controller
                    control={control}
                    name="device_internal_code"
                    render={({ field }) => (
                      <InputField
                        placeholder="Código interno"
                        error={errors.device_internal_code?.message}
                        className={cn(CONTROL, 'font-mono text-[12px]')}
                        {...field}
                        value={field.value || ''}
                        disabled={!!linkedParent}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Condição de entrada */}
              <div className="mt-3.5">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Condição de entrada
                </label>
                <Controller
                  control={control}
                  name="device_condition"
                  render={({ field }) => (
                    <InputField
                      placeholder="Ex: Tela trincada, sem bateria, carcaça com arranhões…"
                      error={errors.device_condition?.message}
                      className={CONTROL}
                      {...field}
                      value={field.value || ''}
                      disabled={!!linkedParent}
                    />
                  )}
                />
              </div>
            </div>

            {/* ── Descrição do serviço ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="size-3.5 text-slate-400" strokeWidth={2} />
                <h3 className="text-[13px] font-bold text-slate-800">Descrição do serviço</h3>
              </div>
              <div className="h-px bg-slate-100 mb-4" />

              {/* Problema relatado */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Problema relatado pelo cliente <span className="text-primary">*</span>
                </label>
                <Controller
                  control={control}
                  name="reported_issue"
                  render={({ field }) => (
                    <>
                      <Textarea
                        placeholder="Descreva o defeito informado pelo cliente, o comportamento do equipamento e qualquer sintoma relevante."
                        className={cn(AREA, 'min-h-22', errors.reported_issue && 'border-destructive')}
                        rows={4}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.reported_issue && (
                        <p className="mt-1 text-xs text-destructive">{errors.reported_issue.message}</p>
                      )}
                    </>
                  )}
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Será visível no laudo e no histórico da OS
                </p>
              </div>

              {/* Observações internas */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Observações internas
                </label>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <>
                      <Textarea
                        placeholder="Notas internas da equipe — não aparecem para o cliente…"
                        className={cn(AREA, 'min-h-18', errors.notes && 'border-destructive')}
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.notes && (
                        <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="border-t border-slate-200 px-6 py-3.5 flex items-center justify-between bg-white">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="size-3 text-slate-300" />
              Rascunho salvo automaticamente
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={
                  isEdit && initialData
                    ? `/dashboard/ordens-de-servico/${initialData.id}`
                    : '/dashboard/ordens-de-servico'
                }
                className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md text-[13px]')}
              >
                Cancelar
              </Link>
              <Button
                type="submit"
                disabled={isBusy || showUpgradeNotice}
                loading={isBusy}
                className="h-9 rounded-md bg-primary hover:bg-primary/90 px-4 text-[13px]"
              >
                {isEdit ? 'Salvar Alterações' : 'Abrir OS'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
