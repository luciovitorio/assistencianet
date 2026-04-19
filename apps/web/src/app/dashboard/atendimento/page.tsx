import { getCompanyContext } from '@/lib/auth/company-context'
import { getConversations } from '@/app/actions/atendimento'
import { createClient } from '@/lib/supabase/server'
import { AtendimentoShell } from './_components/atendimento-shell'

export const metadata = { title: 'Atendimento' }

export default async function AtendimentoPage() {
  const { companyId, isAdmin } = await getCompanyContext()
  const supabase = await createClient()

  const [conversations, branchesResult] = await Promise.all([
    getConversations(),
    isAdmin
      ? supabase
          .from('branches')
          .select('id, name')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('name')
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const branches = (branchesResult.data ?? []) as { id: string; name: string }[]

  return (
    // Cancela os paddings do <main> (px-8, pb-12) e a margem de pt-24 para
    // encostar no header (h-16 = 4rem). Ocupa a altura de 100vh - 4rem.
    <div className="-mt-8 -mx-8 -mb-12 h-[calc(100vh-4rem)]">
      <AtendimentoShell
        initialConversations={conversations}
        companyId={companyId}
        isAdmin={isAdmin}
        branches={branches}
      />
    </div>
  )
}
