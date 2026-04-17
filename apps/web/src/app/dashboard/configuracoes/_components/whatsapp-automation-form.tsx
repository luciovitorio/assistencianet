'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Bot,
  CheckCircle2,
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
import { Textarea } from '@/components/ui/textarea'
import type {
  ResolvedWhatsAppAutomationSettings,
  WhatsAppAutomationProvider,
} from '@/lib/whatsapp/automation-settings'
import { WHATSAPP_MESSAGE_VARIABLES } from '@/lib/whatsapp/message-templates'
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
}> = [
  {
    value: 'whatsapp_cloud_api',
    label: 'Meta Cloud API',
    description: 'API oficial, templates aprovados e webhook da Meta.',
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
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl border p-4 text-left shadow-sm transition',
              active
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">
              {option.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MessageTextareaField({
  error,
  helper,
  label,
  placeholder,
  registration,
}: {
  error?: string
  helper: string
  label: string
  placeholder?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <Textarea
        className={cn(CONTROL, 'h-auto min-h-[118px] py-3 leading-6')}
        placeholder={placeholder}
        {...registration}
      />
      <p className="text-xs leading-5 text-slate-500">{helper}</p>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}

function TriggerFields({
  control,
  errors,
  register,
}: {
  control: Control<WhatsAppAutomationSettingsSchema>
  errors: FieldErrors<WhatsAppAutomationSettingsSchema>
  register: UseFormRegister<WhatsAppAutomationSettingsSchema>
}) {
  const [activeTab, setActiveTab] = React.useState<'triggers' | 'messages'>(
    'triggers',
  )

  return (
    <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Bot className="size-4 text-emerald-700" />
          Gatilhos operacionais
        </CardTitle>
        <CardDescription>
          Defina quais eventos disparam mensagens e edite os textos usados pela automação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            { value: 'triggers', label: 'Gatilhos' },
            { value: 'messages', label: 'Mensagens' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as 'triggers' | 'messages')}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition',
                activeTab === tab.value
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="DDI padrão"
            helper="Usado para normalizar telefones brasileiros."
            className={CONTROL}
            error={errors.default_country_code?.message}
            {...register('default_country_code')}
          />
          <InputField
            label="Idioma dos templates"
            helper="Ex: pt_BR"
            className={CONTROL}
            error={errors.templates_language?.message}
            {...register('templates_language')}
          />
        </div>

        <InputField
          type="number"
          label="Tempo de sessão (minutos)"
          helper="Inatividade acima desse tempo reinicia a conversa do zero. Mínimo: 5 — Máximo: 1440 (24 h)."
          className={CONTROL}
          error={errors.session_timeout_minutes?.message}
          {...register('session_timeout_minutes')}
        />

        {activeTab === 'triggers' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="notify_inbound_message"
              render={({ field }) => (
                <BooleanField
                  checked={field.value}
                  label="Mensagem recebida"
                  description="Responder automaticamente quando alguém chamar no WhatsApp."
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              Este gatilho usa a mensagem editável da aba Mensagens. Para a Meta, respostas fora da janela de 24h ainda dependem de template aprovado.
            </div>

            <Controller
              control={control}
              name="notify_os_created"
              render={({ field }) => (
                <BooleanField
                  checked={field.value}
                  label="OS aberta"
                  description="Enviar confirmação de recebimento quando a OS for aberta."
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <InputField
              label="Template Meta para OS aberta"
              placeholder="os_aberta"
              className={CONTROL}
              error={errors.template_os_created?.message}
              {...register('template_os_created')}
            />

            <Controller
              control={control}
              name="notify_estimate_ready"
              render={({ field }) => (
                <BooleanField
                  checked={field.value}
                  label="Orçamento pronto"
                  description="Avisar quando o orçamento estiver disponível para aprovação."
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <InputField
              label="Template Meta para orçamento"
              placeholder="orcamento_pronto"
              className={CONTROL}
              error={errors.template_estimate_ready?.message}
              {...register('template_estimate_ready')}
            />

            <Controller
              control={control}
              name="notify_service_completed"
              render={({ field }) => (
                <BooleanField
                  checked={field.value}
                  label="Serviço concluído"
                  description="Avisar quando o equipamento estiver pronto para retirada."
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <InputField
              label="Template Meta para conclusão"
              placeholder="servico_concluido"
              className={CONTROL}
              error={errors.template_service_completed?.message}
              {...register('template_service_completed')}
            />

            <Controller
              control={control}
              name="notify_satisfaction_survey"
              render={({ field }) => (
                <BooleanField
                  checked={field.value}
                  label="Pesquisa de satisfação"
                  description="Enviar pesquisa após a conclusão da OS."
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <InputField
              label="Template Meta para satisfação"
              placeholder="pesquisa_satisfacao"
              className={CONTROL}
              error={errors.template_satisfaction_survey?.message}
              {...register('template_satisfaction_survey')}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">
                Variáveis disponíveis
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {WHATSAPP_MESSAGE_VARIABLES.map((variable) => (
                  <span
                    key={variable}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm"
                  >
                    {variable}
                  </span>
                ))}
              </div>
            </div>

            <InputField
              label="Marcas autorizadas"
              helper="Exibidas na variável {{marcas_autorizadas}} do menu de boas-vindas. Ex: Samsung, Apple, Motorola, LG"
              className={CONTROL}
              placeholder="Samsung, Apple, Motorola, LG"
              error={errors.authorized_brands?.message}
              {...register('authorized_brands')}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <MessageTextareaField
                label="Resposta automática inicial"
                helper="Usada quando alguém entra em contato pelo WhatsApp."
                error={errors.message_inbound_auto_reply?.message}
                registration={register('message_inbound_auto_reply')}
              />
              <MessageTextareaField
                label="OS aberta"
                helper="Mensagem enviada quando uma ordem de serviço é criada."
                error={errors.message_os_created?.message}
                registration={register('message_os_created')}
              />
              <MessageTextareaField
                label="Orçamento pronto"
                helper="Mensagem enviada quando o orçamento fica disponível."
                error={errors.message_estimate_ready?.message}
                registration={register('message_estimate_ready')}
              />
              <MessageTextareaField
                label="Serviço concluído"
                helper="Mensagem enviada quando o equipamento fica pronto para retirada."
                error={errors.message_service_completed?.message}
                registration={register('message_service_completed')}
              />
              <MessageTextareaField
                label="Pesquisa de satisfação"
                helper="Mensagem enviada após a conclusão do atendimento."
                error={errors.message_satisfaction_survey?.message}
                registration={register('message_satisfaction_survey')}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  isPending,
  operation,
  qrCodeCount,
  qrCodeImage,
  onConnect,
  onDelete,
  onLogout,
  onRefreshStatus,
}: {
  connectedPhone: string | null
  connectionState: string | null
  instanceName: string | null
  isPending: boolean
  operation: EvolutionOperation | null
  qrCodeCount: number | null
  qrCodeImage: string | null
  onConnect: () => void
  onDelete: () => void
  onLogout: () => void
  onRefreshStatus: () => void
}) {
  return (
    <Card className="border border-slate-200 shadow-sm shadow-slate-950/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Wifi className="size-4 text-emerald-700" />
          Conexão Evolution
        </CardTitle>
        <CardDescription>
          Crie a instância, gere o QR Code e controle a sessão sem abrir o Manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Instância salva
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
            <p className="mt-3 text-xs leading-5 text-emerald-900">
              Escaneie pelo WhatsApp do aparelho que ficará conectado ao atendimento.
              A tela atualiza automaticamente após conectar.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
            Preencha URL, API key e nome da instância para gerar o QR Code.
          </div>
        )}

        <div className="grid gap-2">
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
          <Button
            type="button"
            loading={isPending && operation === 'connect'}
            disabled={isPending}
            onClick={onConnect}
            className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
          >
            <QrCode className="size-4" />
            Salvar, criar e gerar QR Code
          </Button>
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
      evolution_base_url: initialSettings.evolutionBaseUrl,
      evolution_api_key: '',
      evolution_instance_name: initialSettings.evolutionInstanceName ?? '',
      evolution_webhook_url: initialSettings.evolutionWebhookUrl ?? '',
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
  const evolutionInstanceName =
    useWatch({
      control,
      name: 'evolution_instance_name',
    }) ?? initialSettings.evolutionInstanceName

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

      if (showToast) {
        toast.success(`Status da Evolution: ${getEvolutionStateLabel(result.state)}.`)
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

  const handleConnectEvolution = () => {
    setEvolutionOperation('connect')
    startEvolutionOperationTransition(async () => {
      try {
        const isValid = await trigger()

        if (!isValid) {
          toast.error('Revise os campos da Evolution antes de gerar o QR Code.')
          return
        }

        const saveResult = await saveWhatsAppAutomationSettings({
          ...getValues(),
          provider: 'evolution_api',
        })

        if (hasActionError(saveResult)) {
          toast.error(saveResult.error)
          return
        }

        const createResult = await createEvolutionApiInstance()

        if (hasActionError(createResult)) {
          toast.error(createResult.error)
          return
        }

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
        toast.success(
          createResult.alreadyExists
            ? 'Configuração salva e QR Code gerado para a instância existente.'
            : 'Configuração salva, instância criada e QR Code gerado.',
        )
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

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
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
          ) : (
            <Card
              key="evolution-api-settings"
              className="border border-slate-200 shadow-sm shadow-slate-950/5"
            >
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <KeyRound className="size-4 text-emerald-700" />
                  Configurações da Evolution
                </CardTitle>
                <CardDescription>
                  Informe os dados da Evolution API instalada no Docker ou publicada em um
                  domínio. Nenhum valor sensível fica hardcoded.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
                <InputField
                  label="URL da Evolution API"
                  helper="Ex: http://127.0.0.1:8080"
                  className={cn(CONTROL, 'md:col-span-2')}
                  error={errors.evolution_base_url?.message}
                  {...register('evolution_base_url')}
                />
                <InputField
                  label="API key da Evolution"
                  type="password"
                  helper={
                    initialSettings.evolutionApiKeyConfigured
                      ? 'Já existe uma API key salva. Preencha apenas para substituir.'
                      : 'Use o valor AUTHENTICATION_API_KEY configurado na Evolution.'
                  }
                  className={cn(CONTROL, 'md:col-span-2')}
                  error={errors.evolution_api_key?.message}
                  {...register('evolution_api_key')}
                />
                <InputField
                  label="Nome da instância"
                  helper="Ex: orquidia_matriz. Use letras, números, hífen ou underline."
                  className={CONTROL}
                  error={errors.evolution_instance_name?.message}
                  {...register('evolution_instance_name')}
                />
                <InputField
                  label="Webhook da Evolution"
                  helper="Opcional. Use quando a API estiver publicada e puder chamar o sistema."
                  className={CONTROL}
                  error={errors.evolution_webhook_url?.message}
                  {...register('evolution_webhook_url')}
                />
              </CardContent>
            </Card>
          )}

          <TriggerFields control={control} errors={errors} register={register} />
        </div>

        <div className="space-y-6">
          {provider === 'evolution_api' && (
            <EvolutionConnectionPanel
              connectedPhone={evolutionConnectedPhone}
              connectionState={evolutionConnectionState}
              instanceName={
                typeof evolutionInstanceName === 'string'
                  ? evolutionInstanceName.trim() || null
                  : null
              }
              isPending={isEvolutionOperationPending}
              operation={evolutionOperation}
              qrCodeCount={evolutionQrCodeCount}
              qrCodeImage={evolutionQrCodeImage}
              onConnect={handleConnectEvolution}
              onDelete={handleDeleteEvolution}
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
              {provider === 'whatsapp_cloud_api' ? (
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
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  loading={isValidatingEvolution}
                  disabled={isValidatingEvolution}
                  onClick={handleValidateEvolution}
                  className="w-full rounded-xl"
                >
                  Validar Evolution API
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
