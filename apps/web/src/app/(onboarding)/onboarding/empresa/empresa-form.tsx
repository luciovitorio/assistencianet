'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { saveEmpresa } from '@/app/actions/onboarding'
import { empresaSchema, type EmpresaSchema } from '@/lib/validations/onboarding'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    formState: { errors },
  } = useForm<EmpresaSchema>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { name: defaultName },
  })

  function onSubmit(data: EmpresaSchema) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v) formData.set(k, String(v)) })
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
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autorizada">Autorizada</SelectItem>
                  <SelectItem value="multimarca">Multimarca</SelectItem>
                  <SelectItem value="autorizada_multimarca">Autorizada + Multimarca</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
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
