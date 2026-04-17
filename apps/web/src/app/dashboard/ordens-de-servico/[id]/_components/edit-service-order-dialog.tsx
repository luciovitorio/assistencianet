'use client'

import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { editServiceOrder } from '@/app/actions/service-orders'
import {
  editServiceOrderSchema,
  type EditServiceOrderSchema,
} from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'
const AREA =
  'rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

export interface EditServiceOrderData {
  id: string
  branch_id: string
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

interface EditServiceOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceOrder: EditServiceOrderData
  branches: { id: string; name: string }[]
  technicians: { id: string; name: string }[]
  deviceTypes: string[]
}

export function EditServiceOrderDialog({
  open,
  onOpenChange,
  serviceOrder,
  branches,
  technicians,
  deviceTypes,
}: EditServiceOrderDialogProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditServiceOrderSchema>({
    resolver: zodResolver(editServiceOrderSchema),
    defaultValues: {
      branch_id: serviceOrder.branch_id,
      device_type: serviceOrder.device_type,
      device_brand: serviceOrder.device_brand || '',
      device_model: serviceOrder.device_model || '',
      device_serial: serviceOrder.device_serial || '',
      device_condition: serviceOrder.device_condition || '',
      reported_issue: serviceOrder.reported_issue || '',
      technician_id: serviceOrder.technician_id || '',
      estimated_delivery: serviceOrder.estimated_delivery || '',
      notes: serviceOrder.notes || '',
    },
  })

  // Reset form when serviceOrder changes or modal opens
  React.useEffect(() => {
    if (open) {
      reset({
        branch_id: serviceOrder.branch_id,
        device_type: serviceOrder.device_type,
        device_brand: serviceOrder.device_brand || '',
        device_model: serviceOrder.device_model || '',
        device_serial: serviceOrder.device_serial || '',
        device_condition: serviceOrder.device_condition || '',
        reported_issue: serviceOrder.reported_issue || '',
        technician_id: serviceOrder.technician_id || '',
        estimated_delivery: serviceOrder.estimated_delivery || '',
        notes: serviceOrder.notes || '',
      })
    }
  }, [open, serviceOrder, reset])

  const onSubmit = (data: EditServiceOrderSchema) => {
    startTransition(async () => {
      try {
        const result = await editServiceOrder(serviceOrder.id, data)
        if (result?.error) throw new Error(result.error)
        toast.success('Ordem de Serviço atualizada com sucesso.')
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Erro ao editar a Ordem de Serviço.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Ajuste as informações do equipamento e a descrição do problema.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-semibold">Filial *</Label>
                  <Controller
                    control={control}
                    name="branch_id"
                    render={({ field }) => {
                      const selected = branches.find((b) => b.id === field.value)
                      return (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(CONTROL, errors.branch_id && 'border-destructive')}>
                            <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                              {selected ? selected.name : 'Selecione a filial'}
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
                  {errors.branch_id && <p className="mt-1 text-xs text-destructive">{errors.branch_id.message}</p>}
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold">Técnico responsável</Label>
                  <Controller
                    control={control}
                    name="technician_id"
                    render={({ field }) => {
                      const selected = technicians.find((t) => t.id === field.value)
                      return (
                        <Select value={field.value || ''} onValueChange={(val) => field.onChange(val === '__none' ? '' : val)}>
                          <SelectTrigger className={cn(CONTROL, errors.technician_id && 'border-destructive')}>
                            <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-semibold">Tipo *</Label>
                  <Controller
                    control={control}
                    name="device_type"
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(CONTROL, errors.device_type && 'border-destructive')}>
                          <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                            {field.value || 'Selecione o tipo'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.device_type && <p className="mt-1 text-xs text-destructive">{errors.device_type.message}</p>}
                </div>
                
                <Controller
                  control={control}
                  name="estimated_delivery"
                  render={({ field }) => (
                    <DatePickerField
                      label="Previsão de entrega"
                      placeholder="Selecione a data"
                      error={errors.estimated_delivery?.message}
                      className={CONTROL}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Controller control={control} name="device_brand" render={({ field }) => <InputField label="Marca" placeholder="Ex: Taiff" error={errors.device_brand?.message} className={CONTROL} {...field} value={field.value || ''} />} />
                <Controller control={control} name="device_model" render={({ field }) => <InputField label="Modelo" placeholder="Ex: Vulcan" error={errors.device_model?.message} className={CONTROL} {...field} value={field.value || ''} />} />
                <Controller control={control} name="device_serial" render={({ field }) => <InputField label="Série" placeholder="Ex: NS-001245" error={errors.device_serial?.message} className={CONTROL} {...field} value={field.value || ''} />} />
              </div>

              <Controller control={control} name="device_condition" render={({ field }) => <InputField label="Condição de entrada" placeholder="Ex: Cabo ressecado" error={errors.device_condition?.message} className={CONTROL} {...field} value={field.value || ''} />} />

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Problema relatado pelo cliente *</Label>
                <Controller
                  control={control}
                  name="reported_issue"
                  render={({ field }) => (
                    <>
                      <Textarea placeholder="Descreva o problema" className={cn(AREA, 'min-h-[100px]', errors.reported_issue && 'border-destructive')} {...field} value={field.value || ''} />
                      {errors.reported_issue && <p className="text-xs text-destructive">{errors.reported_issue.message}</p>}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Observações internas</Label>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <>
                      <Textarea placeholder="Observações" className={cn(AREA, 'min-h-[100px]', errors.notes && 'border-destructive')} {...field} value={field.value || ''} />
                      {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
                    </>
                  )}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} loading={isPending}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
