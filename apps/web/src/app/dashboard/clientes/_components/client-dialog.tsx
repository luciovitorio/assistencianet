'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  clientSchema,
  type ClientSchema,
  CLIENT_CLASSIFICATIONS,
  CLIENT_CLASSIFICATION_LABELS,
  CLIENT_CLASSIFICATION_COLORS,
} from '@/lib/validations/client'
import { createClient, updateClient } from '@/app/actions/clients'

export interface ClientFormState {
  id?: string
  name?: string
  document?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  zip_code?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  origin_branch_id?: string | null
  active?: boolean
  classification?: string | null
  classification_manual?: boolean
}

interface BranchOption {
  id: string
  name: string
}

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const

interface ClientDialogProps {
  client?: ClientFormState
  branches: BranchOption[]
  defaultOriginBranchId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: { id: string; name: string; phone: string; document: string }) => void
}

async function fetchAddressByCep(cep: string) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      street: data.logradouro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    }
  } catch {
    return null
  }
}

export function ClientDialog({
  client,
  branches,
  defaultOriginBranchId,
  open,
  onOpenChange,
  onSuccess,
}: ClientDialogProps) {
  const isEditing = Boolean(client?.id)
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [isFetchingCep, setIsFetchingCep] = React.useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientSchema>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      document: '',
      phone: '',
      email: '',
      zip_code: '',
      street: '',
      number: '',
      complement: '',
      city: '',
      state: '',
      notes: '',
      origin_branch_id: defaultOriginBranchId || '',
      active: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: client?.name || '',
        document: client?.document || '',
        phone: client?.phone || '',
        email: client?.email || '',
        zip_code: client?.zip_code || '',
        street: client?.street || client?.address || '',
        number: client?.number || '',
        complement: client?.complement || '',
        city: client?.city || '',
        state: client?.state || '',
        notes: client?.notes || '',
        origin_branch_id: client?.origin_branch_id || defaultOriginBranchId || '',
        active: client?.active !== false,
        classification: (client?.classification as ClientSchema['classification']) || 'novo',
        classification_manual: client?.classification_manual ?? false,
      })
    }
  }, [open, client, defaultOriginBranchId, reset])

  const handleCepChange = async (maskedValue: string) => {
    const digits = maskedValue.replace(/\D/g, '')
    if (digits.length !== 8) return
    setIsFetchingCep(true)
    const result = await fetchAddressByCep(digits)
    setIsFetchingCep(false)
    if (!result) return
    setValue('street', result.street, { shouldValidate: true })
    setValue('city', result.city, { shouldValidate: true })
    setValue('state', result.state, { shouldValidate: true })
  }

  const onSubmit = (data: ClientSchema) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateClient(client!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Cliente atualizado com sucesso.')
        } else {
          const result = await createClient(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Cliente cadastrado com sucesso.')
          if (onSuccess && 'client' in result && result.client) {
            onSuccess(result.client)
          }
        }

        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Ocorreu um erro ao salvar o cliente.')
      }
    })
  }

  const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    // This dialog is reused inside other forms (for example, OS creation).
    // Stop the submit from bubbling through the React tree and triggering the parent form.
    event.stopPropagation()
    void handleSubmit(onSubmit)(event)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do cliente. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar um novo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-4" id="client-form">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome completo / razão social *"
                    placeholder="Ex: Maria Silva ou Salão Bela Vista"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="document"
              render={({ field }) => (
                <MaskedInputField
                  mask="cpf-cnpj"
                  label="CPF/CNPJ *"
                  placeholder="000.000.000-00"
                  error={errors.document?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <MaskedInputField
                  mask="phone"
                  label="Telefone / WhatsApp *"
                  placeholder="(00) 00000-0000"
                  error={errors.phone?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <div className="sm:col-span-2 xl:col-span-3">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <InputField
                    label="E-mail"
                    type="email"
                    placeholder="cliente@email.com"
                    error={errors.email?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="zip_code"
              render={({ field }) => (
                <MaskedInputField
                  mask="cep"
                  label="CEP"
                  placeholder="00000-000"
                  error={errors.zip_code?.message}
                  rightIcon={isFetchingCep ? <Loader2 className="animate-spin" /> : undefined}
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e)
                    handleCepChange(e.target.value)
                  }}
                />
              )}
            />

            <div className="sm:col-span-2 xl:col-span-2">
              <Controller
                control={control}
                name="street"
                render={({ field }) => (
                  <InputField
                    label="Rua"
                    placeholder="Ex: Rua das Flores"
                    error={errors.street?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="number"
              render={({ field }) => (
                <InputField
                  label="Número"
                  placeholder="Ex: 123"
                  error={errors.number?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="complement"
              render={({ field }) => (
                <InputField
                  label="Complemento"
                  placeholder="Ex: Sala 2"
                  error={errors.complement?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <InputField
                  label="Cidade"
                  placeholder="Sua cidade"
                  error={errors.city?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="state"
              render={({ field }) => {
                const selectedState = BRAZILIAN_STATES.find((state) => state.value === field.value)

                return (
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium">Estado (UF)</Label>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                        <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                          {selectedState
                            ? `${selectedState.label} (${selectedState.value})`
                            : 'Selecione o estado'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label} ({state.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-destructive text-xs mt-1">{errors.state.message}</p>
                    )}
                  </div>
                )
              }}
            />

            <div>
              <Label className="mb-1.5 block text-sm font-medium">Filial de origem *</Label>
              <Controller
                control={control}
                name="origin_branch_id"
                render={({ field }) => {
                  const selectedBranchId = field.value ?? ''
                  const selectedBranchName = selectedBranchId
                    ? (branches.find((branch) => branch.id === selectedBranchId)?.name ??
                      'Selecione a filial')
                    : 'Selecione a filial'

                  return (
                    <Select value={selectedBranchId} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={errors.origin_branch_id ? 'border-destructive' : ''}
                      >
                        <span
                          className={selectedBranchId ? 'text-foreground' : 'text-muted-foreground'}
                        >
                          {selectedBranchName}
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
              {errors.origin_branch_id && (
                <p className="text-destructive text-xs mt-1">{errors.origin_branch_id.message}</p>
              )}
            </div>

            <div className="flex items-end pb-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Cliente ativo
                  </Label>
                )}
              />
            </div>

            {/* Classificação */}
            <div className="sm:col-span-2 xl:col-span-3 rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Classificação</p>
                  <p className="text-xs text-muted-foreground">
                    Calculada automaticamente pelas OS finalizadas. Ative a opção abaixo para definir manualmente.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="classification_manual"
                  render={({ field }) => (
                    <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Definir manualmente
                    </Label>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="classification"
                render={({ field: classField }) => (
                  <Controller
                    control={control}
                    name="classification_manual"
                    render={({ field: manualField }) => (
                      <div className="flex flex-wrap gap-2">
                        {CLIENT_CLASSIFICATIONS.map((value) => {
                          const isSelected = classField.value === value
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!manualField.value}
                              onClick={() => classField.onChange(value)}
                              className={[
                                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all',
                                isSelected
                                  ? `${CLIENT_CLASSIFICATION_COLORS[value]} border-transparent`
                                  : 'bg-background text-muted-foreground border-border',
                                !manualField.value && 'opacity-60 cursor-not-allowed',
                                manualField.value && !isSelected && 'hover:border-primary/50',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {CLIENT_CLASSIFICATION_LABELS[value]}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-2 xl:col-span-3">
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label>Observações internas</Label>
                    <Textarea
                      placeholder="Informações úteis para a equipe."
                      className={errors.notes ? 'border-destructive' : ''}
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
          <Button type="submit" form="client-form" disabled={isPending} loading={isPending}>
            Salvar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
