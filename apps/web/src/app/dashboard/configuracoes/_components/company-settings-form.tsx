'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { saveCompanySettings } from '@/app/actions/company-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputField } from '@/components/ui/input-field'
import type { ResolvedCompanySettings } from '@/lib/company-settings'
import {
  companySettingsSchema,
  type CompanySettingsSchema,
} from '@/lib/validations/company-settings'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

interface CompanySettingsFormProps {
  initialSettings: ResolvedCompanySettings
}

export function CompanySettingsForm({ initialSettings }: CompanySettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<CompanySettingsSchema>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      default_warranty_days: initialSettings.defaultWarrantyDays,
      default_estimate_validity_days: initialSettings.defaultEstimateValidityDays,
    },
  })

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
                Defaults comerciais
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Defina os prazos padrão usados nos novos orçamentos. O cadastro de equipamentos
              agora fica no menu Cadastros, com tipo, fabricante, modelo e voltagem.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Settings2 className="size-4 text-cyan-700" />
              Defaults comerciais
            </CardTitle>
            <CardDescription>
              Esses valores entram preenchidos no novo orçamento e podem ser ajustados caso a caso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <InputField
              label="Garantia default"
              helper="Aplicado automaticamente em novos orçamentos."
              type="number"
              min="0"
              step="1"
              className={CONTROL}
              error={errors.default_warranty_days?.message}
              {...register('default_warranty_days', { valueAsNumber: true })}
            />

            <InputField
              label="Validade default do orçamento"
              helper="Quantidade de dias para preencher a validade inicial."
              type="number"
              min="0"
              step="1"
              className={CONTROL}
              error={errors.default_estimate_validity_days?.message}
              {...register('default_estimate_validity_days', { valueAsNumber: true })}
            />

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
      </form>
    </div>
  )
}
