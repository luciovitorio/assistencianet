'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
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
  employeeSchema,
  EMPLOYEE_ROLES,
  ROLE_LABELS,
  type EmployeeSchema,
  type EmployeeValues,
  type EmployeeRole,
} from '@/lib/validations/employee'
import { createEmployee, updateEmployee } from '@/app/actions/employees'

const getLaborRateFieldValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? value : ''

export interface EmployeeFormState {
  id?: string
  name?: string
  role?: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  branch_id?: string | null
  active?: boolean
  labor_rate?: number | null
}

interface BranchOption {
  id: string
  name: string
}

interface EmployeeDialogProps {
  employee?: EmployeeFormState
  branches: BranchOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeDialog({ employee, branches, open, onOpenChange }: EmployeeDialogProps) {
  const isEditing = !!employee?.id
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeSchema, unknown, EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      role: 'atendente',
      email: '',
      phone: '',
      cpf: '',
      branch_id: '',
      active: true,
      labor_rate: null,
    },
  })

  const watchedRole = useWatch({ control, name: 'role' })

  React.useEffect(() => {
    if (open) {
      reset({
        name: employee?.name || '',
        role: (employee?.role as EmployeeSchema['role']) || 'atendente',
        email: employee?.email || '',
        phone: employee?.phone || '',
        cpf: employee?.cpf || '',
        branch_id: employee?.branch_id || '',
        active: employee?.active !== false,
        labor_rate: employee?.labor_rate ?? null,
      })
    }
  }, [open, employee, reset])

  const onSubmit = (data: EmployeeValues) => {
    const payload = {
      ...data,
      labor_rate: data.labor_rate ?? null,
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateEmployee(employee!.id!, payload)
          if (result?.error) throw new Error(result.error)
          toast.success('Funcionário atualizado com sucesso.')
        } else {
          const result = await createEmployee(payload)
          if (result?.error) throw new Error(result.error)
          toast.success('Funcionário cadastrado com sucesso.')
        }
        router.refresh()
        onOpenChange(false)
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Ocorreu um erro ao salvar o funcionário.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do funcionário. Clique em salvar ao terminar.'
              : 'Preencha os dados abaixo para cadastrar um novo funcionário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4" id="employee-form" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <InputField
                    label="Nome completo *"
                    placeholder="Ex: João da Silva"
                    error={errors.name?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">Cargo *</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {field.value
                          ? ROLE_LABELS[field.value as EmployeeRole]
                          : 'Selecione o cargo'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-destructive text-xs mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">Filial *</Label>
              <Controller
                control={control}
                name="branch_id"
                render={({ field }) => {
                  const selectedBranchId = field.value ?? ''
                  const selectedBranchName = selectedBranchId
                    ? (branches.find((b) => b.id === selectedBranchId)?.name ??
                      'Selecione a filial')
                    : 'Selecione a filial'

                  return (
                    <Select value={selectedBranchId} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.branch_id ? 'border-destructive' : ''}>
                        <span
                          className={selectedBranchId ? 'text-foreground' : 'text-muted-foreground'}
                        >
                          {selectedBranchName}
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
              name="cpf"
              render={({ field }) => (
                <MaskedInputField
                  mask="cpf-cnpj"
                  label="CPF"
                  placeholder="000.000.000-00"
                  error={errors.cpf?.message}
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
                    placeholder="funcionario@email.com"
                    error={errors.email?.message}
                    {...field}
                    value={field.value || ''}
                  />
                )}
              />
            </div>

            <div className="sm:col-span-2 mt-2">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Label className="flex items-center gap-2 font-medium cursor-pointer">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Funcionário Ativo
                  </Label>
                )}
              />
            </div>

            {watchedRole === 'tecnico' && (
              <div className="sm:col-span-2">
                <Controller
                  control={control}
                  name="labor_rate"
                  render={({ field }) => (
                    <InputField
                      label="Valor de mão de obra por OS (R$)"
                      type="number"
                      placeholder="Ex: 50.00"
                      min="0"
                      step="0.01"
                      error={errors.labor_rate?.message}
                      {...field}
                      value={getLaborRateFieldValue(field.value)}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  )}
                />
              </div>
            )}
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
          <Button type="submit" form="employee-form" disabled={isPending} loading={isPending}>
            Salvar Funcionário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
