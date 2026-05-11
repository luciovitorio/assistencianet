'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Controller,
  useForm,
  useWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle2,
  Clock,
  Globe,
  KeyRound,
  MessageSquareText,
  PlugZap,
  Power,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  connectEvolutionApiInstance,
  createEvolutionApiInstance,
  deleteEvolutionApiInstance,
  getEvolutionApiConnectionState,
  getEvolutionWebhookUrlWarning,
  logoutEvolutionApiInstance,
  saveWhatsAppAutomationSettings,
  validateEvolutionApiSettings,
  validateWhatsAppAutomationSdk,
} from '@/app/actions/whatsapp-automation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type {
  ResolvedWhatsAppAutomationSettings,
  WhatsAppAutomationProvider,
} from '@/lib/whatsapp/automation-settings'
import {
  whatsappAutomationSettingsSchema,
  type WhatsAppAutomationSettingsSchema,
} from '@/lib/validations/whatsapp-automation-settings'
import { cn } from '@/lib/utils'

const CONTROL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

const PROVIDER_OPTIONS: Array<{
  value: WhatsAppAutomationProvider
  label: string
  description: string
  disabled?: boolean
}> = [
  {
    value: 'whatsapp_cloud_api',
    label: 'Meta Cloud API',
    description: 'API oficial, templates aprovados e webhook da Meta.',
    disabled: true,
  },
  {
    value: 'evolution_api',
    label: 'Evolution API',
    description: 'Ponte local via QR Code para o piloto operacional.',
  },
]

interface WhatsAppAutomationFormProps {
  initialSettings: ResolvedWhatsAppAutomationSettings
}

function BooleanField({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  )
}

function ProviderTabs({
  provider,
  onChange,
}: {
  provider: WhatsAppAutomationProvider
  onChange: (provider: WhatsAppAutomationProvider) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {PROVIDER_OPTIONS.map((option) => {
        const active = provider === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && onChange(option.value)}
            disabled={option.disabled}
            className={cn(
              'rounded-xl border p-4 text-left shadow-sm transition',
              option.disabled
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                : active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {option.label}
              {option.disabled && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Em breve
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {option.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}


type EvolutionOperation =
  | 'create'
  | 'connect'
  | 'status'
  | 'logout'
  | 'delete'

const getEvolutionStateLabel = (state: string | null) => {
  if (!state) return 'Status não consultado'

  const labels: Record<string, string> = {
    loading: 'Consultando status...',
    open: 'Conectado',
    connecting: 'Aguardando QR Code',
    close: 'Desconectado',
  }

  return labels[state] ?? state
}

const getEvolutionStateClassName = (state: string | null) => {
  if (state === 'open') return 'bg-emerald-100 text-emerald-800'
  if (state === 'connecting') return 'bg-amber-100 text-amber-800'
  if (state === 'close') return 'bg-slate-100 text-slate-700'
  if (state === 'loading') return 'bg-blue-100 text-blue-800'

  return 'bg-slate-100 text-slate-600'
}

const isEvolutionConnected = (state: string | null) => state === 'open'

const normalizeQrCodeImage = (base64: string | null) => {
  if (!base64) return null
  if (base64.startsWith('data:image/')) return base64

  return `data:image/png;base64,${base64}`
}

const formatEvolutionConnectedPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }

  return digits ? `+${digits}` : phone
}

const hasActionError = (
  result: { error?: string },
): result is { error: string } => !!result.error

function EvolutionConnectionPanel({
  connectedPhone,
  connectionState,
  instanceName,
  instanceReady,
  isPending,
  operation,
  qrCodeCount,
  qrCodeImage,
  webhookOk,
  onCreateInstance,
  onDelete,
  onGenerateQrCode,
  onLogout,
  onRefreshStatus,
}: {
  connectedPhone: string | null
  connectionState: string | null
  instanceName: string | null
  instanceReady: boolean
  isPending: boolean
  operation: EvolutionOperation | null
  qrCodeCount: number | null
  qrCodeImage: string | null
  webhookOk: boolean | null
  onCreateInstance: () => void
  onDelete: () => void
  onGenerateQrCode: () => void
  onLogout: () => void
  onRefreshStatus: () => void
}) {
  const QR_TTL = 20
  const [countdown, setCountdown] = React.useState(QR_TTL)

  React.useEffect(() => {
    if (!qrCodeImage) return
    setCountdown(QR_TTL)
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [qrCodeImage])

  React.useEffect(() => {
    if (countdown === 0 && qrCodeImage && !isPending) onGenerateQrCode()
  }, [countdown, qrCodeImage, isPending, onGenerateQrCode])

  return (
    <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Wifi className="size-4 text-emerald-700" />
          Conexão Evolution
        </CardTitle>
        <CardDescription>
          Passo 1: crie a instância. Passo 2: gere o QR Code e conecte o WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Instância salva no sistema
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-slate-950">
            {instanceName || 'Salve o nome da instância'}
          </p>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Telefone conectado
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-950">
              {connectedPhone
                ? formatEvolutionConnectedPhone(connectedPhone)
                : isEvolutionConnected(connectionState)
                  ? 'Telefone não informado pela Evolution'
                  : 'Conecte a instância para exibir o telefone'}
            </p>
          </div>
          <span
            className={cn(
              'mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              getEvolutionStateClassName(connectionState),
            )}
          >
            {getEvolutionStateLabel(connectionState)}
          </span>
          {isEvolutionConnected(connectionState) && webhookOk === false && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-medium leading-5 text-amber-800">
                Webhook desconfigurado — o bot não receberá mensagens. Clique em{' '}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={onCreateInstance}
                >
                  Registrar webhook
                </button>{' '}
                para corrigir.
              </p>
            </div>
          )}
        </div>

        {qrCodeImage ? (
          <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-950">
                QR Code para pareamento
              </p>
              {qrCodeCount !== null && (
                <span className="text-xs font-medium text-emerald-700">
                  tentativa {qrCodeCount}
                </span>
              )}
            </div>
            <div className="mt-4 flex justify-center rounded-lg bg-white p-3">
              <Image
                src={qrCodeImage}
                alt="QR Code para conectar o WhatsApp"
                width={224}
                height={224}
                unoptimized
                className="size-56 max-w-full rounded-md"
              />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-700">
                <span>Escaneie pelo WhatsApp do aparelho que ficará conectado.</span>
                <span className="font-semibold tabular-nums">{countdown}s</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${(countdown / QR_TTL) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-700/70">
                O código expira automaticamente e um novo será gerado.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
            {(() => {
              const instanceExists = instanceReady || connectionState !== null
              if (!instanceExists) {
                return instanceName
                  ? 'Clique em "Conectar instância na Evolution" para registrar na Evolution API.'
                  : 'Salve as configurações para criar a instância.'
              }
              if (isEvolutionConnected(connectionState)) {
                return 'WhatsApp conectado. Clique em "Gerar QR Code" para reconectar se necessário.'
              }
              return 'Clique em "Gerar QR Code" para conectar seu WhatsApp.'
            })()}
          </div>
        )}

        <div className="grid gap-2">
          {/* Ação principal: um botão verde por vez conforme o estado */}
          {(() => {
            const instanceExists = instanceReady || connectionState !== null
            const connected = isEvolutionConnected(connectionState)
            if (!instanceExists && instanceName) {
              return (
                <Button
                  type="button"
                  loading={isPending && operation === 'create'}
                  disabled={isPending}
                  onClick={onCreateInstance}
                  className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
                >
                  <PlugZap className="size-4" />
                  Conectar instância na Evolution
                </Button>
              )
            }
            if (instanceExists && !connected) {
              return (
                <Button
                  type="button"
                  loading={isPending && operation === 'connect'}
                  disabled={isPending}
                  onClick={onGenerateQrCode}
                  className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
                >
                  <QrCode className="size-4" />
                  Gerar QR Code
                </Button>
              )
            }
            return null
          })()}

          {/* Utilitários: sempre visíveis */}
          <Button
            type="button"
            variant="outline"
            loading={isPending && operation === 'status'}
            disabled={isPending}
            onClick={onRefreshStatus}
            className="w-full rounded-xl"
          >
            <RefreshCw className="size-4" />
            Consultar status
          </Button>
          {instanceName && (
            <Button
              type="button"
              variant="outline"
              loading={isPending && operation === 'create'}
              disabled={isPending}
              onClick={onCreateInstance}
              className="w-full rounded-xl text-slate-500"
            >
              <PlugZap className="size-4" />
              Registrar webhook
            </Button>
          )}

          {/* Gerenciamento: só quando instância existe */}
          {(instanceReady || connectionState !== null) && (
            <>
              <Button
                type="button"
                variant="outline"
                loading={isPending && operation === 'logout'}
                disabled={isPending}
                onClick={onLogout}
                className="w-full rounded-xl"
              >
                <Power className="size-4" />
                Desconectar sessão
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={isPending && operation === 'delete'}
                disabled={isPending}
                onClick={onDelete}
                className="w-full rounded-xl"
              >
                <Trash2 className="size-4" />
                Remover instância
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function WhatsAppAutomationForm({
  initialSettings,
}: WhatsAppAutomationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [isValidatingMeta, startMetaValidationTransition] = React.useTransition()
  const [isValidatingEvolution, startEvolutionValidationTransition] =
    React.useTransition()
  const [isEvolutionOperationPending, startEvolutionOperationTransition] =
    React.useTransition()
  const [evolutionOperation, setEvolutionOperation] =
    React.useState<EvolutionOperation | null>(null)
  const [evolutionConnectionState, setEvolutionConnectionState] =
    React.useState<string | null>(null)
  const [evolutionConnectedPhone, setEvolutionConnectedPhone] =
    React.useState<string | null>(null)
  const [evolutionQrCodeImage, setEvolutionQrCodeImage] =
    React.useState<string | null>(null)
  const [evolutionQrCodeCount, setEvolutionQrCodeCount] =
    React.useState<number | null>(null)
  const [evolutionInstanceReady, setEvolutionInstanceReady] =
    React.useState(false)
  const [evolutionWebhookOk, setEvolutionWebhookOk] = React.useState<
    boolean | null
  >(null)
  const hasNotifiedEvolutionConnectedRef = React.useRef(false)
  const {
    control,
    getValues,
    handleSubmit,
    register,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<WhatsAppAutomationSettingsSchema>({
    resolver: zodResolver(whatsappAutomationSettingsSchema),
    defaultValues: {
      enabled: initialSettings.enabled,
      provider: initialSettings.provider,
      base_url: initialSettings.baseUrl,
      graph_api_version: initialSettings.graphApiVersion,
      app_id: initialSettings.appId ?? '',
      app_secret: '',
      phone_number_id: initialSettings.phoneNumberId ?? '',
      business_account_id: initialSettings.businessAccountId ?? '',
      access_token: '',
      webhook_verify_token: '',
      default_country_code: initialSettings.defaultCountryCode,
      templates_language: initialSettings.templatesLanguage,
      notify_inbound_message: initialSettings.notifyInboundMessage,
      notify_os_created: initialSettings.notifyOsCreated,
      notify_estimate_ready: initialSettings.notifyEstimateReady,
      notify_service_completed: initialSettings.notifyServiceCompleted,
      notify_satisfaction_survey: initialSettings.notifySatisfactionSurvey,
      template_os_created: initialSettings.templateOsCreated ?? '',
      template_estimate_ready: initialSettings.templateEstimateReady ?? '',
      template_service_completed: initialSettings.templateServiceCompleted ?? '',
      template_satisfaction_survey:
        initialSettings.templateSatisfactionSurvey ?? '',
      message_inbound_auto_reply: initialSettings.messageInboundAutoReply,
      message_os_created: initialSettings.messageOsCreated,
      message_estimate_ready: initialSettings.messageEstimateReady,
      message_service_completed: initialSettings.messageServiceCompleted,
      message_satisfaction_survey: initialSettings.messageSatisfactionSurvey,
      authorized_brands: initialSettings.authorizedBrands ?? '',
      session_timeout_minutes: initialSettings.sessionTimeoutMinutes,
      session_expiry_warning_minutes: initialSettings.sessionExpiryWarningMinutes ?? '',
      session_expiry_warning_message: initialSettings.sessionExpiryWarningMessage ?? '',
    },
  })

  const enabled =
    useWatch({
      control,
      name: 'enabled',
    }) ?? false
  const provider =
    useWatch({
      control,
      name: 'provider',
    }) ?? initialSettings.provider
  const evolutionInstanceName = initialSettings.evolutionInstanceName ?? null

  const onSubmit = (data: WhatsAppAutomationSettingsSchema) => {
    startTransition(async () => {
      const result = await saveWhatsAppAutomationSettings(data)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Automação do WhatsApp salva com sucesso.')
      router.refresh()
    })
  }

  const handleValidateMeta = () => {
    startMetaValidationTransition(async () => {
      const result = await validateWhatsAppAutomationSdk()

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(`SDK oficial carregada com sucesso (${result.version}).`)
    })
  }

  const handleValidateEvolution = () => {
    startEvolutionValidationTransition(async () => {
      const result = await validateEvolutionApiSettings()

      if (result?.error) {
        toast.error(result.error)
        return
      }

      const suffix =
        result.instanceFound === true
          ? ' Instância encontrada.'
          : ` ${result.instanceCount} instância(s) retornada(s).`
      toast.success(`Evolution API validada com sucesso.${suffix}`)
    })
  }

  const applyEvolutionConnectionState = React.useCallback(
    (state: string | null, { notifyConnected }: { notifyConnected: boolean }) => {
      setEvolutionConnectionState(state)

      if (!isEvolutionConnected(state)) {
        setEvolutionConnectedPhone(null)
        return
      }

      setEvolutionQrCodeImage(null)
      setEvolutionQrCodeCount(null)

      if (notifyConnected && !hasNotifiedEvolutionConnectedRef.current) {
        hasNotifiedEvolutionConnectedRef.current = true
        toast.success('WhatsApp conectado com sucesso.')
      }
    },
    [],
  )

  const refreshEvolutionConnectionState = React.useCallback(
    async ({
      notifyConnected = true,
      showToast,
    }: {
      notifyConnected?: boolean
      showToast: boolean
    }) => {
      const result = await getEvolutionApiConnectionState()

      if (hasActionError(result)) {
        if (showToast) {
          toast.error(result.error)
        }

        return false
      }

      applyEvolutionConnectionState(result.state, { notifyConnected })
      setEvolutionConnectedPhone(
        isEvolutionConnected(result.state) ? (result.connectedPhone ?? null) : null,
      )
      setEvolutionInstanceReady(true)
      setEvolutionWebhookOk(result.webhookOk ?? null)

      if (showToast) {
        const webhookWarning =
          isEvolutionConnected(result.state) && result.webhookOk === false
            ? ' Webhook desconfigurado — clique em "Registrar webhook".'
            : ''
        toast.success(
          `Status da Evolution: ${getEvolutionStateLabel(result.state)}.${webhookWarning}`,
        )
      }

      return true
    },
    [applyEvolutionConnectionState],
  )

  const handleRefreshEvolutionStatus = () => {
    setEvolutionOperation('status')
    startEvolutionOperationTransition(async () => {
      try {
        await refreshEvolutionConnectionState({ showToast: true })
      } finally {
        setEvolutionOperation(null)
      }
    })
  }

  const handleCreateEvolutionInstance = () => {
    setEvolutionOperation('create')
    startEvolutionOperationTransition(async () => {
      try {
        const warning = await getEvolutionWebhookUrlWarning()
        if (warning && !window.confirm(warning)) {
          return
        }

        const createResult = await createEvolutionApiInstance()

        if (hasActionError(createResult)) {
          toast.error(createResult.error)
          return
        }

        setEvolutionInstanceReady(true)
        setEvolutionWebhookOk(createResult.webhookConfigured ? true : false)
        toast.success(
          createResult.alreadyExists
            ? 'Instância já existe na Evolution API.'
            : 'Instância criada com sucesso.',
        )
        if (!createResult.webhookConfigured) {
          toast.warning(
            'Webhook não registrado automaticamente. Defina APP_BASE_URL no ambiente e tente novamente.',
            { duration: 8000 },
          )
        }
      } finally {
        setEvolutionOperation(null)
      }
    })
  }

  const handleGenerateQrCode = () => {
    setEvolutionOperation('connect')
    startEvolutionOperationTransition(async () => {
      try {
        const connectResult = await connectEvolutionApiInstance()

        if (hasActionError(connectResult)) {
          toast.error(connectResult.error)
          return
        }

        hasNotifiedEvolutionConnectedRef.current = false
        applyEvolutionConnectionState('connecting', { notifyConnected: false })
        setEvolutionConnectedPhone(null)
        setEvolutionQrCodeImage(normalizeQrCodeImage(connectResult.base64))
        setEvolutionQrCodeCount(connectResult.count)
        toast.success('QR Code gerado. Escaneie com o WhatsApp.')
      } finally {
        setEvolutionOperation(null)
      }
    })
  }

  const handleLogoutEvolution = () => {
    setEvolutionOperation('logout')
    startEvolutionOperationTransition(async () => {
      try {
        const result = await logoutEvolutionApiInstance()

        if (hasActionError(result)) {
          toast.error(result.error)
          return
        }

        setEvolutionConnectionState('close')
        setEvolutionConnectedPhone(null)
        setEvolutionQrCodeImage(null)
        setEvolutionQrCodeCount(null)
        hasNotifiedEvolutionConnectedRef.current = false
        toast.success('Sessão da Evolution desconectada.')
      } finally {
        setEvolutionOperation(null)
      }
    })
  }

  const handleDeleteEvolution = () => {
    setEvolutionOperation('delete')
    startEvolutionOperationTransition(async () => {
      try {
        const result = await deleteEvolutionApiInstance()

        if (hasActionError(result)) {
          toast.error(result.error)
          return
        }

        setEvolutionConnectionState(null)
        setEvolutionConnectedPhone(null)
        setEvolutionQrCodeImage(null)
        setEvolutionQrCodeCount(null)
        setEvolutionInstanceReady(false)
        hasNotifiedEvolutionConnectedRef.current = false
        toast.success('Instância da Evolution removida.')
      } finally {
        setEvolutionOperation(null)
      }
    })
  }

  React.useEffect(() => {
    if (
      provider !== 'evolution_api' ||
      !initialSettings.evolutionInstanceName ||
      evolutionQrCodeImage
    ) {
      return
    }

    let active = true

    const loadSavedConnectionState = async () => {
      setEvolutionConnectionState((currentState) => currentState ?? 'loading')
      const refreshed = await refreshEvolutionConnectionState({
        notifyConnected: false,
        showToast: false,
      })

      if (active && !refreshed) {
        setEvolutionConnectionState(null)
      }
    }

    void loadSavedConnectionState()

    return () => {
      active = false
    }
  }, [
    evolutionQrCodeImage,
    initialSettings.evolutionInstanceName,
    provider,
    refreshEvolutionConnectionState,
  ])

  React.useEffect(() => {
    if (
      provider !== 'evolution_api' ||
      !evolutionQrCodeImage ||
      isEvolutionConnected(evolutionConnectionState)
    ) {
      return
    }

    let active = true

    const pollConnectionState = async () => {
      if (!active) return
      await refreshEvolutionConnectionState({ showToast: false })
    }

    void pollConnectionState()
    const intervalId = window.setInterval(pollConnectionState, 3000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [
    evolutionConnectionState,
    evolutionQrCodeImage,
    provider,
    refreshEvolutionConnectionState,
  ])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(34,197,94,0.08),rgba(255,255,255,1))] p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Automação
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  WhatsApp Business
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <MessageSquareText className="size-3.5" />
                  {provider === 'evolution_api'
                    ? 'Evolution API ativa'
                    : 'Meta Cloud API ativa'}
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Configure credenciais, provedor ativo e gatilhos sem valores fixos no código.
                A Orquídea pode começar pela Evolution API e migrar para a Meta depois.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-90">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {enabled ? 'Automação habilitada' : 'Automação pausada'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Segredos
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-300">
                {provider === 'evolution_api'
                  ? initialSettings.evolutionApiKeyConfigured
                    ? 'API key salva'
                    : 'API key pendente'
                  : initialSettings.accessTokenConfigured
                    ? 'Token Meta salvo'
                    : 'Token Meta pendente'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]"
      >
        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <PlugZap className="size-4 text-emerald-700" />
                Provedor ativo
              </CardTitle>
              <CardDescription>
                Escolha qual integração será usada pela automação. As duas configurações ficam
                salvas para troca controlada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Controller
                control={control}
                name="enabled"
                render={({ field }) => (
                  <BooleanField
                    checked={field.value}
                    label="Habilitar automação do WhatsApp"
                    description="Quando habilitado, o sistema valida os campos obrigatórios do provedor ativo."
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <ProviderTabs
                provider={provider}
                onChange={(value) =>
                  setValue('provider', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {errors.provider?.message && (
                <p className="text-sm font-medium text-destructive">
                  {errors.provider.message}
                </p>
              )}
            </CardContent>
          </Card>

          {provider === 'whatsapp_cloud_api' ? (
            <Card
              key="meta-cloud-api-settings"
              className="border border-slate-200 shadow-sm shadow-slate-950/5"
            >
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <KeyRound className="size-4 text-emerald-700" />
                  Configurações da Meta
                </CardTitle>
                <CardDescription>
                  Use token permanente de usuário do sistema. Campos sensíveis ficam mascarados
                  na auditoria e não são exibidos novamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
                <InputField
                  label="Host da Cloud API"
                  helper="Informe apenas o host. Ex: graph.facebook.com"
                  className={CONTROL}
                  error={errors.base_url?.message}
                  {...register('base_url')}
                />
                <InputField
                  label="Versão da Graph API"
                  helper="Formato usado pela SDK oficial. Ex: v16.0"
                  className={CONTROL}
                  error={errors.graph_api_version?.message}
                  {...register('graph_api_version')}
                />
                <InputField
                  label="App ID"
                  className={CONTROL}
                  error={errors.app_id?.message}
                  {...register('app_id')}
                />
                <InputField
                  label="App Secret"
                  type="password"
                  helper={
                    initialSettings.appSecretConfigured
                      ? 'Já existe um App Secret salvo. Preencha apenas para substituir.'
                      : 'Necessário para validar assinaturas do webhook.'
                  }
                  className={CONTROL}
                  error={errors.app_secret?.message}
                  {...register('app_secret')}
                />
                <InputField
                  label="ID do número do WhatsApp"
                  helper="Phone Number ID exibido no painel da Meta."
                  className={CONTROL}
                  error={errors.phone_number_id?.message}
                  {...register('phone_number_id')}
                />
                <InputField
                  label="ID da conta WhatsApp Business"
                  helper="WhatsApp Business Account ID."
                  className={CONTROL}
                  error={errors.business_account_id?.message}
                  {...register('business_account_id')}
                />
                <InputField
                  label="Token permanente de acesso"
                  type="password"
                  helper={
                    initialSettings.accessTokenConfigured
                      ? 'Já existe um token salvo. Preencha apenas para substituir.'
                      : 'Use um token permanente de usuário do sistema.'
                  }
                  className={cn(CONTROL, 'md:col-span-2')}
                  error={errors.access_token?.message}
                  {...register('access_token')}
                />
                <InputField
                  label="Token de verificação do webhook"
                  type="password"
                  helper={
                    initialSettings.webhookVerifyTokenConfigured
                      ? 'Já existe um token salvo. Preencha apenas para substituir.'
                      : 'Precisa ser igual ao token configurado na Meta.'
                  }
                  className={cn(CONTROL, 'md:col-span-2')}
                  error={errors.webhook_verify_token?.message}
                  {...register('webhook_verify_token')}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Clock className="size-4 text-emerald-700" />
                Sessão do bot
              </CardTitle>
              <CardDescription>
                Tempo de inatividade antes de encerrar a sessão e aviso antecipado ao cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <InputField
                label="Tempo de sessão (minutos)"
                type="number"
                helper="Inatividade máxima antes de resetar a conversa. Mín: 5, Máx: 1440."
                className={CONTROL}
                error={errors.session_timeout_minutes?.message}
                {...register('session_timeout_minutes')}
              />
              <InputField
                label="Avisar cliente X minutos antes de expirar"
                type="number"
                helper="Deixe vazio para não enviar aviso. Deve ser menor que o tempo de sessão."
                className={CONTROL}
                error={errors.session_expiry_warning_minutes?.message}
                {...register('session_expiry_warning_minutes')}
              />
              <div className="space-y-1.5">
                <Label>Mensagem de aviso de sessão</Label>
                <Textarea
                  rows={3}
                  placeholder="⏳ Sua sessão está encerrando por inatividade. Responda para continuar ou, ao retornar, envie qualquer mensagem para começar novamente."
                  className="resize-y text-sm"
                  {...register('session_expiry_warning_message')}
                />
                <p className="text-xs text-muted-foreground">
                  Mensagem enviada quando o tempo de aviso chegar. Se vazia, usa o texto padrão acima.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Globe className="size-4 text-emerald-700" />
                Configurações gerais
              </CardTitle>
              <CardDescription>
                DDI padrão, idioma dos templates e marcas autorizadas pelo bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <InputField
                label="DDI padrão"
                type="text"
                helper="Código do país sem + ou zeros à esquerda. Ex: 55 para Brasil."
                className={CONTROL}
                error={errors.default_country_code?.message}
                {...register('default_country_code')}
              />
              <InputField
                label="Idioma dos templates"
                type="text"
                helper="Código de idioma no formato pt_BR, en_US, es_ES."
                className={CONTROL}
                error={errors.templates_language?.message}
                {...register('templates_language')}
              />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          {provider === 'evolution_api' && (
            <EvolutionConnectionPanel
              connectedPhone={evolutionConnectedPhone}
              connectionState={evolutionConnectionState}
              instanceName={evolutionInstanceName}
              instanceReady={evolutionInstanceReady}
              isPending={isEvolutionOperationPending}
              operation={evolutionOperation}
              qrCodeCount={evolutionQrCodeCount}
              qrCodeImage={evolutionQrCodeImage}
              onCreateInstance={handleCreateEvolutionInstance}
              webhookOk={evolutionWebhookOk}
              onDelete={handleDeleteEvolution}
              onGenerateQrCode={handleGenerateQrCode}
              onLogout={handleLogoutEvolution}
              onRefreshStatus={handleRefreshEvolutionStatus}
            />
          )}

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="size-4 text-emerald-700" />
                Checklist
              </CardTitle>
              <CardDescription>
                Use a validação do provedor ativo antes de disparar mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                Webhook Meta: <strong>/api/webhooks/whatsapp</strong>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />
                A Meta exige templates aprovados para iniciar conversas fora da janela de 24h.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />
                A Evolution precisa de API key e instância conectada por QR Code.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />
                A troca de provedor fica registrada no log de auditoria da empresa.
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Salvar e validar</CardTitle>
              <CardDescription>
                Salve antes de validar para testar as credenciais persistidas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="submit"
                loading={isPending}
                disabled={isPending}
                className="w-full rounded-xl bg-slate-950 hover:bg-slate-800"
              >
                Salvar automação
              </Button>
              {provider === 'whatsapp_cloud_api' && (
                <Button
                  type="button"
                  variant="outline"
                  loading={isValidatingMeta}
                  disabled={isValidatingMeta}
                  onClick={handleValidateMeta}
                  className="w-full rounded-xl"
                >
                  Validar Meta Cloud API
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
