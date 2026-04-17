'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Truck } from 'lucide-react'
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
import { supplierSchema, type SupplierSchema } from '@/lib/validations/supplier'
import { createSupplier, updateSupplier } from '@/app/actions/suppliers'

export interface SupplierFormState {
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

interface SupplierDialogProps {
  supplier?: SupplierFormState
  branches: BranchOption[]
  defaultOriginBranchId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function SupplierDialog({
  supplier,
  branches,
  defaultOriginBranchId,
  open,
  onOpenChange,
}: SupplierDialogProps) {
  const isEditing = Boolean(supplier?.id)
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [isFetchingCep, setIsFetchingCep] = React.useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SupplierSchema>({
    resolver: zodResolver(supplierSchema),
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
        name: supplier?.name || '',
        document: supplier?.document || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        zip_code: supplier?.zip_code || '',
        street: supplier?.street || supplier?.address || '',
        number: supplier?.number || '',
        complement: supplier?.complement || '',
        city: supplier?.city || '',
        state: supplier?.state || '',
        notes: supplier?.notes || '',
        origin_branch_id: supplier?.origin_branch_id || defaultOriginBranchId || '',
        active: supplier?.active !== false,
      })
    }
  }, [open, supplier, defaultOriginBranchId, reset])

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

  const onSubmit = (data: SupplierSchema) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateSupplier(supplier!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Fornecedor atualizado com sucesso.')
        } else {
          const result = await createSupplier(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Fornecedor cadastrado com sucesso.')
        }

        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Ocorreu um erro ao salvar o fornecedor.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[72rem] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do fornecedor. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar um novo fornecedor.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="supplier-form">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome completo / razão social *"
                    placeholder="Ex: Distribuidora Central"
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
                  placeholder="00.000.000/0000-00"
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
                    placeholder="fornecedor@email.com"
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
                    placeholder="Ex: Avenida Brasil"
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
                  placeholder="Ex: Galpão B"
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
              <Label className="mb-1.5 block text-sm font-medium">Filial de cadastro *</Label>
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
                    Fornecedor ativo
                  </Label>
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
                      placeholder="Condições comerciais, prazo de entrega ou observações úteis."
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
          <Button type="submit" form="supplier-form" disabled={isPending} loading={isPending}>
            Salvar Fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
