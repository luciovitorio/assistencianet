'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ClipboardList, Search, X, Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { BEAUTY_SALON_DEVICE_TYPE_DEFAULTS } from '@/lib/company-settings'
import {
  serviceOrderSchema,
  type ServiceOrderSchema,
} from '@/lib/validations/service-order'
import { createServiceOrder } from '@/app/actions/service-orders'
import { ClientDialog } from '@/app/dashboard/clientes/_components/client-dialog'
import type { BranchOption, ClientOption, EmployeeOption } from './service-order-list'

// ─── Client Search Combobox ───────────────────────────────────────────────────

interface ClientSearchInputProps {
  clients: ClientOption[]
  value: string
  onChange: (clientId: string) => void
  onClientCreated: (client: ClientOption) => void
  error?: string
  branches: BranchOption[]
  defaultBranchId: string | null
}

const mergeClientsById = (...groups: ClientOption[][]) =>
  Array.from(new Map(groups.flat().map((client) => [client.id, client])).values())

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
    () => clients.find((c) => c.id === value) ?? null,
    [clients, value],
  )

  const filteredClients = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients.slice(0, 8)
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.document ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')),
      )
      .slice(0, 10)
  }, [clients, search])

  const updatePosition = React.useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [])

  const openDropdown = () => {
    updatePosition()
    setIsOpen(true)
  }

  // Click-outside detection
  React.useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen])

  // Reposition on scroll/resize
  React.useEffect(() => {
    if (!isOpen) return
    const update = () => updatePosition()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen, updatePosition])

  const handleSelect = (client: ClientOption) => {
    onChange(client.id)
    setSearch('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    if (value) onChange('') // limpa seleção ao digitar
    if (!isOpen) openDropdown()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
    setIsOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleCreateDialogSuccess = (created: {
    id: string
    name: string
    phone: string
    document: string
  }) => {
    const newClient: ClientOption = {
      id: created.id,
      name: created.name,
      phone: created.phone || null,
      document: created.document || null,
    }
    onClientCreated(newClient)
    onChange(created.id)
    setSearch('')
  }

  const displayValue = selectedClient ? selectedClient.name : search

  const dropdown =
    isOpen && typeof window !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-popover rounded-lg ring-1 ring-foreground/10 shadow-md overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {filteredClients.length === 0 && !search.trim() ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum cliente cadastrado.
                </p>
              ) : filteredClients.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum cliente encontrado para &ldquo;{search}&rdquo;.
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(client)
                    }}
                  >
                    <span>
                      <span className="font-medium">{client.name}</span>
                      {client.phone && (
                        <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>
                      )}
                    </span>
                    {value === client.id && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>

            <div className="border-t">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsOpen(false)
                  setShowCreateDialog(true)
                }}
              >
                <Plus className="size-4 shrink-0" />
                {search.trim()
                  ? `Cadastrar "${search.trim()}" como novo cliente`
                  : 'Cadastrar novo cliente'}
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
          className={`relative flex items-center h-8 rounded-lg border bg-muted transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/50 ${
            error ? 'border-destructive ring-3 ring-destructive/20' : 'border-input'
          }`}
        >
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={openDropdown}
            placeholder="Buscar cliente pelo nome ou telefone..."
            className="flex-1 bg-transparent pl-8 pr-8 py-1 text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
          {(selectedClient || search) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      </div>

      {dropdown}

      <ClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        branches={branches}
        defaultOriginBranchId={defaultBranchId}
        client={search.trim() ? { name: search.trim() } : undefined}
        onSuccess={handleCreateDialogSuccess}
      />
    </>
  )
}

// ─── Service Order Dialog ─────────────────────────────────────────────────────

interface ServiceOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: BranchOption[]
  clients: ClientOption[]
  employees: EmployeeOption[]
  defaultBranchId: string | null
}

export function ServiceOrderDialog({
  open,
  onOpenChange,
  branches,
  clients,
  employees,
  defaultBranchId,
}: ServiceOrderDialogProps) {
  const { navigate } = useRouteTransition()
  const [isPending, startTransition] = React.useTransition()
  const [isNavigatingAway, setIsNavigatingAway] = React.useState(false)
  // Clientes podem ser adicionados localmente ao criar um novo
  const [extraClients, setExtraClients] = React.useState<ClientOption[]>([])
  const allClients = React.useMemo(
    () => mergeClientsById(clients, extraClients),
    [clients, extraClients],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceOrderSchema>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
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

  React.useEffect(() => {
    if (open) {
      reset({
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
      })
      setExtraClients([])
    }
  }, [open, defaultBranchId, reset])

  const onSubmit = (data: ServiceOrderSchema) => {
    if (isPending || isNavigatingAway) return
    startTransition(async () => {
      try {
        const result = await createServiceOrder(data)
        if (result?.error) throw new Error(result.error)
        toast.success(`OS #${result.number} aberta com sucesso.`)
        setIsNavigatingAway(true)
        onOpenChange(false)
        navigate(`/dashboard/ordens-de-servico/${result.id}`)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Ocorreu um erro ao abrir a OS.')
      }
    })
  }

  const isBusy = isPending || isNavigatingAway

  const technicians = employees.filter((e) => e.role === 'tecnico' || e.is_owner)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Nova Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para abrir uma nova OS. O número será gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4" id="service-order-form">

          {/* Seção: Atendimento — filial e cliente lado a lado */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Atendimento
            </p>
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
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className={errors.branch_id ? 'border-destructive' : ''}>
                          <span
                            className={field.value ? 'text-foreground' : 'text-muted-foreground'}
                          >
                            {selected ? selected.name : 'Selecione a filial'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
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

              {/* Cliente */}
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Cliente *</Label>
                <Controller
                  control={control}
                  name="client_id"
                  render={({ field }) => (
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
                  )}
                />
              </div>
            </div>
          </div>

          {/* Seção: Aparelho */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Equipamento
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Tipo *</Label>
                <Controller
                  control={control}
                  name="device_type"
                  render={({ field }) => {
                    const selected = field.value || undefined
                    return (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className={errors.device_type ? 'border-destructive' : ''}>
                          <span
                            className={field.value ? 'text-foreground' : 'text-muted-foreground'}
                          >
                            {selected || 'Selecione o tipo'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {BEAUTY_SALON_DEVICE_TYPE_DEFAULTS.map((deviceType) => (
                            <SelectItem key={deviceType} value={deviceType}>
                              {deviceType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
                {errors.device_type && (
                  <p className="text-destructive text-xs mt-1">{errors.device_type.message}</p>
                )}
              </div>

              <Controller
                control={control}
                name="device_brand"
                render={({ field }) => (
                  <InputField
                    label="Marca"
                    placeholder="Ex: Taiff, Babyliss, Wahl"
                    error={errors.device_brand?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />

              <Controller
                control={control}
                name="device_model"
                render={({ field }) => (
                  <InputField
                    label="Modelo"
                    placeholder="Ex: Vulcan, Nano Titanium, Magic Clip"
                    error={errors.device_model?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />

              <Controller
                control={control}
                name="device_serial"
                render={({ field }) => (
                  <InputField
                    label="Série / Patrimônio"
                    placeholder="Ex: NS-001245 ou etiqueta interna"
                    error={errors.device_serial?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />

              <div className="sm:col-span-2 xl:col-span-4">
                <Controller
                  control={control}
                  name="device_condition"
                  render={({ field }) => (
                    <InputField
                      label="Condição de entrada"
                      placeholder="Ex: Cabo ressecado, carcaça quebrada, sem suporte"
                      error={errors.device_condition?.message}
                      {...field}
                      value={field.value || ''}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Seção: Serviço */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Serviço
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="sm:col-span-2 xl:col-span-3">
                <Controller
                  control={control}
                  name="reported_issue"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label>Problema relatado pelo cliente *</Label>
                      <Textarea
                        placeholder="Descreva o problema conforme relatado para o equipamento..."
                        className={errors.reported_issue ? 'border-destructive' : ''}
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.reported_issue && (
                        <p className="text-destructive text-xs">{errors.reported_issue.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium">Técnico responsável</Label>
                <Controller
                  control={control}
                  name="technician_id"
                  render={({ field }) => {
                    const selected = technicians.find((t) => t.id === field.value)
                    return (
                      <Select
                        value={field.value || ''}
                        onValueChange={(v) => field.onChange(v === '__none' ? '' : v)}
                      >
                        <SelectTrigger
                          className={errors.technician_id ? 'border-destructive' : ''}
                        >
                          <span
                            className={field.value ? 'text-foreground' : 'text-muted-foreground'}
                          >
                            {selected ? selected.name : 'Sem técnico atribuído'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Sem técnico atribuído</SelectItem>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }}
                />
              </div>

              <Controller
                control={control}
                name="estimated_delivery"
                render={({ field }) => (
                  <InputField
                    label="Previsão de entrega"
                    type="date"
                    error={errors.estimated_delivery?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />

              <div className="sm:col-span-2 xl:col-span-3">
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label>Observações internas</Label>
                      <Textarea
                        placeholder="Informações adicionais visíveis apenas para a equipe."
                        className={errors.notes ? 'border-destructive' : ''}
                        rows={2}
                        {...field}
                        value={field.value || ''}
                      />
                      {errors.notes && (
                        <p className="text-destructive text-xs">{errors.notes.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancelar
          </Button>
          <Button type="submit" form="service-order-form" disabled={isBusy} loading={isBusy}>
            Abrir OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
