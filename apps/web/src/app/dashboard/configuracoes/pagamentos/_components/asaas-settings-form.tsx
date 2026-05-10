'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveAsaasSettings, testAsaasConnection } from '@/app/actions/asaas-settings'
import type { AsaasEnvironment } from '@/lib/asaas'

interface AsaasSettingsFormProps {
  initialSettings: {
    enabled: boolean
    environment: AsaasEnvironment
    api_key: string
  }
}

export function AsaasSettingsForm({ initialSettings }: AsaasSettingsFormProps) {
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [environment, setEnvironment] = useState<AsaasEnvironment>(initialSettings.environment)
  const [apiKey, setApiKey] = useState(initialSettings.api_key)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSaving, startSave] = useTransition()
  const [isTesting, startTest] = useTransition()

  function handleSave() {
    setSaveMessage(null)
    startSave(async () => {
      const result = await saveAsaasSettings({ enabled, environment, api_key: apiKey })
      if (result.error) {
        setSaveMessage({ type: 'error', text: result.error })
      } else {
        setSaveMessage({ type: 'success', text: 'Configurações salvas com sucesso.' })
      }
    })
  }

  function handleTest() {
    setTestMessage(null)
    startTest(async () => {
      const result = await testAsaasConnection(apiKey, environment)
      if (result.error) {
        setTestMessage({ type: 'error', text: result.error })
      } else {
        setTestMessage({ type: 'success', text: 'Conexão com o Asaas validada com sucesso.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Checkbox
            checked={enabled}
            onCheckedChange={(v) => setEnabled(v === true)}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-slate-900">Habilitar cobrança PIX via Asaas</span>
            <span className="block text-xs leading-5 text-slate-500">
              Gera cobranças PIX automaticamente quando uma OS fica pronta e envia via WhatsApp.
            </span>
          </span>
        </label>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="environment">Ambiente</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as AsaasEnvironment)}>
              <SelectTrigger id="environment" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
            {environment === 'sandbox' && (
              <p className="text-xs text-amber-600">
                Modo sandbox: use credenciais de{' '}
                <span className="font-medium">sandbox.asaas.com</span> para testes.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-key">API Key do Asaas</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="$aact_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !apiKey.trim()}
              >
                {isTesting ? 'Testando…' : 'Testar'}
              </Button>
            </div>
            {testMessage && (
              <p className={`text-xs ${testMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {testMessage.text}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Encontre sua API Key em{' '}
              <span className="font-medium">
                {environment === 'sandbox' ? 'sandbox.asaas.com' : 'app.asaas.com'}
              </span>{' '}
              → Configurações → Integrações → API Key.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
        {saveMessage && (
          <p className={`text-sm ${saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {saveMessage.text}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 text-xs font-semibold text-slate-700">Como funciona</h3>
        <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside">
          <li>OS marcada como <strong>Pronta</strong> → cobrança PIX gerada automaticamente no Asaas</li>
          <li>QR Code enviado ao cliente via WhatsApp (se WhatsApp estiver configurado)</li>
          <li>Quando o cliente paga, o Asaas notifica o sistema e o status de pagamento é atualizado</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Para receber confirmações automáticas de pagamento, configure o webhook do Asaas com o caminho:{' '}
          <span className="font-mono font-medium break-all">/api/webhooks/asaas</span>
          {' '}(use o domínio do seu sistema).
        </p>
      </div>
    </div>
  )
}
