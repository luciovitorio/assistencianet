'use client'

import { useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { saveEmpresa } from '@/app/actions/onboarding'
import { empresaSchema, type EmpresaSchema } from '@/lib/validations/onboarding'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SEGMENT_LABELS: Record<string, string> = {
  autorizada: 'Autorizada',
  multimarca: 'Multimarca',
  autorizada_multimarca: 'Autorizada + Multimarca',
  outro: 'Outro',
}

interface EmpresaFormProps {
  defaultName?: string
}

export function EmpresaForm({ defaultName = '' }: EmpresaFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<EmpresaSchema>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { name: defaultName, owner_operates: true },
  })

  function onSubmit(data: EmpresaSchema) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        formData.set(k, String(v))
      })
      const result = await saveEmpresa(null, formData)
      if (result?.error) setError('root', { message: result.error })
    })
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress current={1} />

      <div className="bg-background rounded-xl border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Dados da empresa</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Essas informações serão exibidas para sua equipe. Você pode alterar depois nas
            configurações.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <InputField
            label="Nome da empresa *"
            placeholder="Ex: Orquídia Assistência Técnica"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-4">
            <MaskedInputField
              mask="cpf-cnpj"
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              error={errors.cnpj?.message}
              {...register('cnpj')}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Segmento</label>
              <Select onValueChange={(v) => setValue('segment', v as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {(value: string) => SEGMENT_LABELS[value] ?? 'Selecione...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MaskedInputField
              mask="phone"
              label="Telefone principal"
              placeholder="(11) 99999-9999"
              {...register('phone')}
            />
            <InputField
              label="E-mail de contato"
              type="email"
              placeholder="contato@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <Controller
              control={control}
              name="owner_operates"
              render={({ field }) => (
                <Label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={field.value ?? true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <span className="font-medium">Sou o dono e também vou atender clientes</span>
                    <p className="text-muted-foreground text-xs font-normal">
                      Marque esta opção se você também vai atender conversas do WhatsApp e
                      consertar equipamentos. Você aparecerá nas listas de atendentes e técnicos.
                      Pode alterar depois em Configurações.
                    </p>
                  </div>
                </Label>
              )}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" disabled>
              Voltar
            </Button>
            <Button type="submit" loading={isPending}>
              Próximo →
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
