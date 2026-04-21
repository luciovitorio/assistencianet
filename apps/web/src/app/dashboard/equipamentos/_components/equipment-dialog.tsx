'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { createEquipment, updateEquipment } from '@/app/actions/equipments'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { equipmentSchema, type EquipmentSchema } from '@/lib/validations/equipment'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

export interface EquipmentFormState {
  id?: string
  type?: string
  manufacturer?: string
  model?: string
  voltage?: string | null
  notes?: string | null
  active?: boolean
}

interface EquipmentDialogProps {
  equipment?: EquipmentFormState
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (equipment: {
    id: string
    type: string
    manufacturer: string
    model: string
    voltage: string | null
  }) => void
}

export function EquipmentDialog({ equipment, open, onOpenChange, onSuccess }: EquipmentDialogProps) {
  const isEditing = !!equipment?.id
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentSchema>({
    resolver: zodResolver(equipmentSchema) as unknown as Resolver<EquipmentSchema>,
    defaultValues: {
      type: '',
      manufacturer: '',
      model: '',
      voltage: '',
      notes: '',
      active: true,
    },
  })

  React.useEffect(() => {
    if (!open) return
    reset({
      type: equipment?.type || '',
      manufacturer: equipment?.manufacturer || '',
      model: equipment?.model || '',
      voltage: equipment?.voltage || '',
      notes: equipment?.notes || '',
      active: equipment?.active !== false,
    })
  }, [equipment, open, reset])

  const onSubmit = (data: EquipmentSchema) => {
    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateEquipment(equipment!.id!, data)
          : await createEquipment(data)

        if (result?.error) throw new Error(result.error)

        toast.success(isEditing ? 'Equipamento atualizado com sucesso.' : 'Equipamento cadastrado com sucesso.')
        if (result.equipment) onSuccess?.(result.equipment)
        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Ocorreu um erro ao salvar o equipamento.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="size-5 text-primary" />
            {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          </DialogTitle>
          <DialogDescription>
            Cadastre o modelo recorrente para agilizar a abertura de OS e padronizar o histórico.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.stopPropagation()
            void handleSubmit(onSubmit)(event)
          }}
          className="space-y-4 py-4"
          id="equipment-form"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <InputField
                  label="Tipo *"
                  placeholder="Ex: Secador, Prancha, Máquina de corte"
                  error={errors.type?.message}
                  className={CONTROL}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="manufacturer"
              render={({ field }) => (
                <InputField
                  label="Fabricante *"
                  placeholder="Ex: Taiff, Babyliss, Wahl"
                  error={errors.manufacturer?.message}
                  className={CONTROL}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="model"
              render={({ field }) => (
                <InputField
                  label="Modelo *"
                  placeholder="Ex: Vulcan, Nano Titanium, Magic Clip"
                  error={errors.model?.message}
                  className={CONTROL}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="voltage"
              render={({ field }) => (
                <InputField
                  label="Voltagem"
                  placeholder="Ex: 127V, 220V, Bivolt"
                  error={errors.voltage?.message}
                  className={CONTROL}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm font-medium">Observações</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <textarea
                    rows={3}
                    placeholder="Informações adicionais sobre esse equipamento..."
                    className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
              {errors.notes && <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>}
            </div>
            <div className="sm:col-span-2 mt-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex cursor-pointer items-center gap-2 font-medium">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Equipamento ativo
                  </Label>
                )}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="equipment-form" disabled={isPending} loading={isPending}>
            Salvar Equipamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
