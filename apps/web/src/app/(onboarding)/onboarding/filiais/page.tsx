'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { saveFiliais } from '@/app/actions/onboarding'
import { branchFormSchema, type FiliaisFormSchema } from '@/lib/validations/onboarding'
import { z } from 'zod'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const filiaisFormSchema = z.object({
  branches: z.array(branchFormSchema).min(1, 'Adicione ao menos uma filial'),
})

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

export default function OnboardingFiliaisPage() {
  const [isPending, startTransition] = useTransition()
  const [fetchingCepIndex, setFetchingCepIndex] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<FiliaisFormSchema>({
    resolver: zodResolver(filiaisFormSchema),
    defaultValues: { branches: [{ name: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'branches' })

  async function handleCepChange(index: number, maskedValue: string) {
    const digits = maskedValue.replace(/\D/g, '')
    if (digits.length !== 8) return
    setFetchingCepIndex(index)
    const address = await fetchAddressByCep(digits)
    setFetchingCepIndex(null)
    if (!address) return
    setValue(`branches.${index}.street`, address.street, { shouldValidate: true })
    setValue(`branches.${index}.city`, address.city, { shouldValidate: true })
    setValue(`branches.${index}.state`, address.state, { shouldValidate: true })
  }

  function onSubmit(data: FiliaisFormSchema) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('branch_count', data.branches.length.toString())
      data.branches.forEach((b, i) => {
        formData.set(`branch_name_${i}`, b.name)
        if (b.zip_code)   formData.set(`branch_zip_code_${i}`, b.zip_code)
        if (b.street)     formData.set(`branch_street_${i}`, b.street)
        if (b.number)     formData.set(`branch_number_${i}`, b.number)
        if (b.complement) formData.set(`branch_complement_${i}`, b.complement)
        if (b.city)       formData.set(`branch_city_${i}`, b.city)
        if (b.state)      formData.set(`branch_state_${i}`, b.state)
        if (b.phone)      formData.set(`branch_phone_${i}`, b.phone)
      })
      const result = await saveFiliais(null, formData)
      if (result?.error) setError('root', { message: result.error })
    })
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress current={2} />

      <div className="bg-background rounded-xl border p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Filiais</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre as unidades da sua empresa. A primeira será a filial principal.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          {fields.map((field, i) => (
            <div key={field.id}>
              {i > 0 && <Separator className="mb-6" />}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <h3 className="font-medium">
                      {i === 0 ? 'Filial principal' : `Filial ${i + 1}`}
                    </h3>
                  </div>
                  {i > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(i)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remover
                    </Button>
                  )}
                </div>

                <InputField
                  label="Nome da filial *"
                  placeholder="Ex: Filial Centro"
                  error={errors.branches?.[i]?.name?.message}
                  {...register(`branches.${i}.name`)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={control}
                    name={`branches.${i}.zip_code`}
                    render={({ field }) => (
                      <MaskedInputField
                        mask="cep"
                        label="CEP"
                        placeholder="00000-000"
                        rightIcon={
                          fetchingCepIndex === i ? (
                            <Loader2 className="animate-spin" />
                          ) : undefined
                        }
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e)
                          handleCepChange(i, e.target.value)
                        }}
                      />
                    )}
                  />
                  <MaskedInputField
                    mask="phone"
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    {...register(`branches.${i}.phone`)}
                  />
                </div>

                <InputField
                  label="Rua / Logradouro"
                  placeholder="Ex: Rua das Flores"
                  {...register(`branches.${i}.street`)}
                />

                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="Número"
                    placeholder="Ex: 123"
                    {...register(`branches.${i}.number`)}
                  />
                  <div className="col-span-2">
                    <InputField
                      label="Complemento"
                      placeholder="Ex: Sala 2, Fundos"
                      {...register(`branches.${i}.complement`)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <InputField
                      label="Cidade"
                      placeholder="Cidade"
                      {...register(`branches.${i}.city`)}
                    />
                  </div>
                    <InputField
                      label="Estado (UF)"
                      placeholder="SP"
                      maxLength={2}
                      {...register(`branches.${i}.state`, {
                        onChange: (e) => {
                          e.target.value = e.target.value.toUpperCase()
                        },
                        setValueAs: (v: string) => v.toUpperCase(),
                      })}
                    />
                </div>
              </div>
            </div>
          ))}

          {fields.length < 10 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({ name: '' })}
            >
              + Adicionar filial
            </Button>
          )}

          <div className="flex justify-between pt-2">
            <Link
              href="/onboarding/empresa"
              className={cn(buttonVariants({ variant: 'ghost' }))}
            >
              ← Voltar
            </Link>
            <Button type="submit" loading={isPending}>
              Próximo →
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
