'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
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
  thirdPartySchema,
  type ThirdPartySchema,
  THIRD_PARTY_TYPE_LABELS,
  THIRD_PARTY_TYPES,
} from '@/lib/validations/third-party'
import { createThirdParty, updateThirdParty } from '@/app/actions/third-parties'

export interface ThirdPartyFormState {
  id?: string
  name?: string
  type?: string
  document?: string | null
  phone?: string | null
  email?: string | null
  default_return_days?: number | null
  notes?: string | null
  active?: boolean
}

interface ThirdPartyDialogProps {
  thirdParty?: ThirdPartyFormState
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThirdPartyDialog({ thirdParty, open, onOpenChange }: ThirdPartyDialogProps) {
  const isEditing = Boolean(thirdParty?.id)
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThirdPartySchema>({
    resolver: zodResolver(thirdPartySchema),
    defaultValues: {
      name: '',
      type: 'fabricante',
      document: '',
      phone: '',
      email: '',
      default_return_days: undefined,
      notes: '',
      active: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: thirdParty?.name || '',
        type: (thirdParty?.type as ThirdPartySchema['type']) || 'fabricante',
        document: thirdParty?.document || '',
        phone: thirdParty?.phone || '',
        email: thirdParty?.email || '',
        default_return_days: thirdParty?.default_return_days ?? undefined,
        notes: thirdParty?.notes || '',
        active: thirdParty?.active !== false,
      })
    }
  }, [open, thirdParty, reset])

  const onSubmit = (data: ThirdPartySchema) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateThirdParty(thirdParty!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Terceirizada atualizada com sucesso.')
        } else {
          const result = await createThirdParty(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Terceirizada cadastrada com sucesso.')
        }
        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Ocorreu um erro ao salvar a terceirizada.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[36rem] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            {isEditing ? 'Editar Terceirizada' : 'Nova Terceirizada'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da terceirizada. Clique em salvar ao terminar.'
              : 'Preencha os dados para cadastrar uma nova terceirizada (fabricante ou técnico especializado).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="third-party-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome / Razão social *"
                    placeholder="Ex: Samsung Autorizada SP"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">Tipo *</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {field.value
                          ? THIRD_PARTY_TYPE_LABELS[field.value as keyof typeof THIRD_PARTY_TYPE_LABELS]
                          : 'Selecione o tipo'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {THIRD_PARTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {THIRD_PARTY_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-destructive text-xs mt-1">{errors.type.message}</p>
              )}
            </div>

            <Controller
              control={control}
              name="default_return_days"
              render={({ field }) => (
                <InputField
                  label="Prazo padrão de retorno (dias)"
                  type="number"
                  placeholder="Ex: 30"
                  min={1}
                  max={365}
                  error={errors.default_return_days?.message}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? undefined : Number(val))
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="document"
              render={({ field }) => (
                <MaskedInputField
                  mask="cpf-cnpj"
                  label="CPF/CNPJ"
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
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  error={errors.phone?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <InputField
                    label="E-mail"
                    type="email"
                    placeholder="contato@fabricante.com.br"
                    error={errors.email?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
            </div>

            <div className="flex items-end pb-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Terceirizada ativa
                  </Label>
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label>Observações internas</Label>
                    <Textarea
                      placeholder="Contato de referência, condições de envio, prazo real, etc."
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
          <Button type="submit" form="third-party-form" disabled={isPending} loading={isPending}>
            Salvar Terceirizada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
