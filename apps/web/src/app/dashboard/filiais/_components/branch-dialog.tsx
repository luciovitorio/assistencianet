'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { branchSchema, type BranchSchema } from '@/lib/validations/branch'
import { createBranch, updateBranch } from '@/app/actions/branches'
import { Building2, Loader2 } from 'lucide-react'

export interface BranchFormState {
  id?: string
  name?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  active?: boolean | null
}

interface BranchDialogProps {
  branch?: BranchFormState
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
      address: data.logradouro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    }
  } catch {
    return null
  }
}

export function BranchDialog({ branch, open, onOpenChange }: BranchDialogProps) {
  const isEditing = !!branch?.id
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [isFetchingCep, setIsFetchingCep] = React.useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name || '',
      phone: branch?.phone || '',
      address: branch?.address || '',
      city: branch?.city || '',
      state: branch?.state || '',
      zip_code: branch?.zip_code || '',
      active: branch?.active !== false,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: branch?.name || '',
        phone: branch?.phone || '',
        address: branch?.address || '',
        city: branch?.city || '',
        state: branch?.state || '',
        zip_code: branch?.zip_code || '',
        active: branch?.active !== false,
      })
    }
  }, [open, branch, reset])

  const handleCepChange = async (maskedValue: string) => {
    const digits = maskedValue.replace(/\D/g, '')
    if (digits.length !== 8) return
    setIsFetchingCep(true)
    const result = await fetchAddressByCep(digits)
    setIsFetchingCep(false)
    if (!result) return
    setValue('address', result.address, { shouldValidate: true })
    setValue('city', result.city, { shouldValidate: true })
    setValue('state', result.state, { shouldValidate: true })
  }

  const onSubmit = (data: BranchSchema) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateBranch(branch!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Filial atualizada com sucesso.')
        } else {
          const result = await createBranch(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Filial cadastrada com sucesso.')
        }
        router.refresh()
        onOpenChange(false)
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Ocorreu um erro ao salvar a filial.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            {isEditing ? 'Editar Filial' : 'Nova Filial'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da filial selecionada. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar uma nova filial no sistema.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="branch-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome da Filial *"
                    placeholder="Ex: Unidade Centro"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <MaskedInputField
                  mask="phone"
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  error={errors.phone?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

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

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <InputField
                    label="Endereço"
                    placeholder="Ex: Rua das Flores, 123"
                    error={errors.address?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <InputField
                  label="Cidade"
                  placeholder="Sua Cidade"
                  error={errors.city?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <InputField
                  label="Estado (UF)"
                  placeholder="SP"
                  maxLength={2}
                  error={errors.state?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <div className="sm:col-span-2 mt-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Filial Ativa
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
          <Button type="submit" form="branch-form" disabled={isPending} loading={isPending}>
            Salvar Filial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
