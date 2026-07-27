'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, MapPin, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { saveCompanyProfile } from '@/app/actions/company-profile'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  companyProfileSchema,
  type CompanyProfileSchema,
} from '@/lib/validations/company-profile'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

const SEGMENT_LABELS: Record<string, string> = {
  autorizada: 'Autorizada',
  multimarca: 'Multimarca',
  autorizada_multimarca: 'Autorizada + Multimarca',
  outro: 'Outro',
}

interface CompanyProfileFormProps {
  initialValues: {
    name: string
    cnpj: string
    segment: string
    phone: string
    email: string
  }
  mainBranchName: string | null
}

export function CompanyProfileForm({ initialValues, mainBranchName }: CompanyProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    handleSubmit,
    register,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CompanyProfileSchema>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: initialValues,
  })

  const onSubmit = (data: CompanyProfileSchema) => {
    startTransition(async () => {
      const result = await saveCompanyProfile(data)

      if (result?.error) {
        setError('root', { message: result.error })
        toast.error(result.error)
        return
      }

      toast.success('Dados da empresa atualizados.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(8,145,178,0.08),rgba(255,255,255,1))] p-5 shadow-sm shadow-slate-950/5">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Identidade da empresa
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Dados da empresa
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                <ShieldCheck className="size-3.5" />
                Perfil do negócio
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Este é o nome da sua conta (usado no cabeçalho do sistema). Ele é diferente das{' '}
              <strong>filiais</strong>, que são os endereços físicos de atendimento.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-500" />
          <p className="text-sm leading-5 text-slate-600">
            {mainBranchName ? (
              <>
                Sua filial matriz atual é <strong>{mainBranchName}</strong>. Para renomear ou
                cadastrar novos endereços, acesse{' '}
                <Link href="/dashboard/filiais" className="font-semibold text-cyan-700 underline">
                  Filiais
                </Link>
                .
              </>
            ) : (
              <>
                Você ainda não tem uma filial cadastrada. Cadastre pelo menos uma em{' '}
                <Link href="/dashboard/filiais" className="font-semibold text-cyan-700 underline">
                  Filiais
                </Link>{' '}
                para poder abrir ordens de serviço.
              </>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Building2 className="size-4 text-cyan-700" />
                Identificação
              </CardTitle>
              <CardDescription>
                Essas informações aparecem para sua equipe e em documentos gerados pelo sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <InputField
                label="Nome da empresa *"
                placeholder="Ex: Orquídia Assistência Técnica"
                className={CONTROL}
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="grid grid-cols-2 gap-4">
                <MaskedInputField
                  mask="cpf-cnpj"
                  label="CNPJ"
                  placeholder="00.000.000/0000-00"
                  className={CONTROL}
                  error={errors.cnpj?.message}
                  {...register('cnpj')}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Segmento</label>
                  <Select
                    defaultValue={initialValues.segment || undefined}
                    onValueChange={(v) => setValue('segment', v as string)}
                  >
                    <SelectTrigger className={CONTROL}>
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
                  className={CONTROL}
                  {...register('phone')}
                />
                <InputField
                  label="E-mail de contato"
                  type="email"
                  placeholder="contato@empresa.com"
                  className={CONTROL}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <Button
                type="submit"
                loading={isPending}
                disabled={isPending}
                className="w-full rounded-xl bg-slate-950 hover:bg-slate-800"
              >
                Salvar dados da empresa
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
