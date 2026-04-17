'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Settings2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveCompanySettings } from '@/app/actions/company-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputField } from '@/components/ui/input-field'
import { normalizeDeviceTypes, type ResolvedCompanySettings } from '@/lib/company-settings'
import {
  companySettingsSchema,
  type CompanySettingsSchema,
} from '@/lib/validations/company-settings'
import { cn } from '@/lib/utils'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

interface CompanySettingsFormProps {
  initialSettings: ResolvedCompanySettings
}

export function CompanySettingsForm({
  initialSettings,
}: CompanySettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [newDeviceType, setNewDeviceType] = React.useState('')
  const {
    control,
    handleSubmit,
    register,
    setValue,
    formState: { errors },
  } = useForm<CompanySettingsSchema>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      device_types: initialSettings.deviceTypes,
      default_warranty_days: initialSettings.defaultWarrantyDays,
      default_estimate_validity_days: initialSettings.defaultEstimateValidityDays,
    },
  })

  const selectedDeviceTypes = useWatch({
    control,
    name: 'device_types',
  }) ?? []

  const addDeviceType = () => {
    const normalizedValue = newDeviceType.trim()
    if (!normalizedValue) return

    const nextDeviceTypes = normalizeDeviceTypes([...selectedDeviceTypes, normalizedValue])
    setValue('device_types', nextDeviceTypes, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setNewDeviceType('')
  }

  const removeDeviceType = (deviceType: string) => {
    setValue(
      'device_types',
      selectedDeviceTypes.filter((value) => value !== deviceType),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  const onSubmit = (data: CompanySettingsSchema) => {
    startTransition(async () => {
      const result = await saveCompanySettings(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Configuracoes salvas com sucesso.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(8,145,178,0.08),rgba(255,255,255,1))] p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Configuracoes operacionais
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Ajustes da Assistência
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                  <ShieldCheck className="size-3.5" />
                  Fonte de verdade da OS
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Defina quais equipamentos a assistencia atende e os prazos default que devem
                alimentar os novos orcamentos. Essas configuracoes impactam a abertura da OS e a
                proposta comercial da empresa.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tipos ativos
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {selectedDeviceTypes.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Garantia / Validade
              </p>
              <p className="mt-2 text-sm font-medium text-cyan-300">
                {initialSettings.defaultWarrantyDays} dias /{' '}
                {initialSettings.defaultEstimateValidityDays} dias
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]"
      >
        <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Smartphone className="size-4 text-cyan-700" />
              Tipos de equipamento atendidos
            </CardTitle>
            <CardDescription>
              Cadastre e remova livremente os equipamentos reais do salão. Apenas esses tipos
              aparecerao na abertura de novas OS.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Controller
              control={control}
              name="device_types"
              render={() => (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <InputField
                      label="Novo tipo de equipamento"
                      placeholder="Ex: Secador, Prancha, Máquina de corte"
                      className={CONTROL}
                      value={newDeviceType}
                      onChange={(event) => setNewDeviceType(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addDeviceType()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl gap-2"
                      onClick={addDeviceType}
                    >
                      <Plus className="size-4" />
                      Adicionar tipo
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedDeviceTypes.map((deviceType) => (
                      <div
                        key={deviceType}
                        className={cn(
                          'flex items-start justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4',
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{deviceType}</p>
                          <p className="text-xs text-slate-500">
                            Disponivel na abertura de OS
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDeviceType(deviceType)}
                          title={`Excluir ${deviceType}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {errors.device_types && (
                    <p className="text-xs text-destructive">{errors.device_types.message}</p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Settings2 className="size-4 text-cyan-700" />
                Defaults comerciais
              </CardTitle>
              <CardDescription>
                Esses valores entram preenchidos no novo orcamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <InputField
                label="Garantia default"
                helper="Aplicado automaticamente em novos orcamentos."
                type="number"
                min="0"
                step="1"
                className={CONTROL}
                error={errors.default_warranty_days?.message}
                {...register('default_warranty_days', { valueAsNumber: true })}
              />

              <InputField
                label="Validade default do orcamento"
                helper="Quantidade de dias para preencher a validade inicial."
                type="number"
                min="0"
                step="1"
                className={CONTROL}
                error={errors.default_estimate_validity_days?.message}
                {...register('default_estimate_validity_days', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Impacto no fluxo</CardTitle>
              <CardDescription>
                O tipo de equipamento vai para a OS. Garantia e validade entram no novo orcamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Ajuste esses valores sempre que a operação mudar. Isso reduz erro manual e mantém
                o padrão comercial entre filiais e atendentes.
              </div>

              <Button
                type="submit"
                loading={isPending}
                disabled={isPending}
                className="w-full rounded-xl bg-slate-950 hover:bg-slate-800"
              >
                Salvar configuracoes
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
