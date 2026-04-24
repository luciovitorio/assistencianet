'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Wrench } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  serviceSchema,
  SERVICE_CATEGORIES,
  CATEGORY_LABELS,
  type ServiceSchema,
  type ServiceCategory,
} from '@/lib/validations/service'
import { createService, updateService } from '@/app/actions/services'

export interface ServiceFormState {
  id?: string
  name?: string
  code?: string | null
  category?: string
  price?: number | null
  estimated_duration_minutes?: number | null
  warranty_days?: number
  notes?: string | null
  active?: boolean
}

interface ServiceDialogProps {
  service?: ServiceFormState
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ServiceFormValues = Omit<
  ServiceSchema,
  'price' | 'estimated_duration_minutes' | 'warranty_days'
> & {
  price?: string | number
  estimated_duration_minutes?: string | number | null
  warranty_days: string | number
}

export function ServiceDialog({ service, open, onOpenChange }: ServiceDialogProps) {
  const isEditing = !!service?.id
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema) as unknown as Resolver<ServiceFormValues>,
    defaultValues: {
      name: '',
      code: '',
      category: 'reparo',
      price: '',
      estimated_duration_minutes: null,
      warranty_days: 0,
      notes: '',
      active: true,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: service?.name || '',
        code: service?.code || '',
        category: (service?.category as ServiceCategory) || 'reparo',
        price:
          service?.price != null
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                service.price,
              )
            : '',
        estimated_duration_minutes: service?.estimated_duration_minutes ?? null,
        warranty_days: service?.warranty_days ?? 0,
        notes: service?.notes || '',
        active: service?.active !== false,
      })
    }
  }, [open, service, reset])

  const onSubmit = (data: ServiceFormValues) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateService(service!.id!, data)
          if (result?.error) throw new Error(result.error)
          toast.success('Serviço atualizado com sucesso.')
        } else {
          const result = await createService(data)
          if (result?.error) throw new Error(result.error)
          toast.success('Serviço cadastrado com sucesso.')
        }
        router.refresh()
        onOpenChange(false)
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Ocorreu um erro ao salvar o serviço.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do serviço. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar um novo serviço no catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="service-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nome */}
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome do serviço *"
                    placeholder="Ex: Troca de tela, Reparo na placa-mãe"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            {/* Código */}
            <Controller
              control={control}
              name="code"
              render={({ field }) => (
                <InputField
                  label="Código"
                  placeholder="Ex: SRV-001"
                  error={errors.code?.message}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />

            {/* Categoria */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Categoria *</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as ServiceCategory)}
                  >
                    <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {field.value
                          ? CATEGORY_LABELS[field.value as ServiceCategory]
                          : 'Selecione a categoria'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-destructive text-xs mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Preço */}
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <MaskedInputField
                  mask="money"
                  label="Preço (R$)"
                  placeholder="R$ 0,00"
                  error={errors.price?.message}
                  {...field}
                  value={field.value == null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Duração estimada */}
            <Controller
              control={control}
              name="estimated_duration_minutes"
              render={({ field }) => (
                <InputField
                  label="Duração estimada (min)"
                  placeholder="Ex: 60"
                  type="number"
                  error={errors.estimated_duration_minutes?.message}
                  {...field}
                  value={field.value == null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                />
              )}
            />

            {/* Garantia */}
            <Controller
              control={control}
              name="warranty_days"
              render={({ field }) => (
                <InputField
                  label="Garantia (dias)"
                  placeholder="0"
                  type="number"
                  error={errors.warranty_days?.message}
                  {...field}
                  value={!field.value ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Observações */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm font-medium">Observações</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais sobre o serviço..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
              {errors.notes && (
                <p className="text-destructive text-xs mt-1">{errors.notes.message}</p>
              )}
            </div>

            {/* Ativo */}
            <div className="sm:col-span-2 mt-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Serviço Ativo
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
          <Button type="submit" form="service-form" disabled={isPending} loading={isPending}>
            Salvar Serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
