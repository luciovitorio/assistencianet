import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getAsaasSettings } from '@/app/actions/asaas-settings'
import { AsaasSettingsForm } from './_components/asaas-settings-form'

export default async function ConfiguracoesPagamentosPage() {
  try {
    await getAdminContext('configuracoes')
  } catch {
    redirect('/dashboard')
  }

  const settings = await getAsaasSettings()

  return (
    <div className="space-y-6">
      <AsaasSettingsForm initialSettings={settings} />
    </div>
  )
}
