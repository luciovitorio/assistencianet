import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getClientProfile } from '@/app/actions/clients'
import { ClientDetail } from './_components/client-detail'

type Props = { params: Promise<{ id: string }> }

export default async function ClientProfilePage({ params }: Props) {
  const { id } = await params

  let companyId: string
  let isAdmin: boolean
  try {
    const ctx = await getCompanyContext()
    companyId = ctx.companyId
    isAdmin = ctx.isAdmin
  } catch {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const [profile, branchesResult] = await Promise.all([
    getClientProfile(id),
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name'),
  ])

  if (!profile) notFound()

  return (
    <ClientDetail
      profile={profile}
      branches={branchesResult.data ?? []}
      isAdmin={isAdmin}
    />
  )
}
