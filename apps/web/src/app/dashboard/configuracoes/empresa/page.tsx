import { redirect } from 'next/navigation'
import { CompanyProfileForm } from '../_components/company-profile-form'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'

export default async function ConfiguracoesEmpresaPage() {
  const supabase = await createClient()

  let companyId: string

  try {
    companyId = (await getAdminContext('configuracoes')).companyId
  } catch {
    redirect('/dashboard')
  }

  const [{ data: company }, { data: mainBranch }] = await Promise.all([
    supabase
      .from('companies')
      .select('name, cnpj, segment, phone, email')
      .eq('id', companyId)
      .maybeSingle(),
    supabase
      .from('branches')
      .select('name')
      .eq('company_id', companyId)
      .eq('is_main', true)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <CompanyProfileForm
        initialValues={{
          name: company?.name ?? '',
          cnpj: company?.cnpj ?? '',
          segment: company?.segment ?? '',
          phone: company?.phone ?? '',
          email: company?.email ?? '',
        }}
        mainBranchName={mainBranch?.name ?? null}
      />
    </div>
  )
}
