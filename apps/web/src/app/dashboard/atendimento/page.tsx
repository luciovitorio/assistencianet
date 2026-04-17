import { getCompanyContext } from '@/lib/auth/company-context'
import { getConversations } from '@/app/actions/atendimento'
import { AtendimentoShell } from './_components/atendimento-shell'

export const metadata = { title: 'Atendimento' }

export default async function AtendimentoPage() {
  const { companyId, isAdmin } = await getCompanyContext()
  const conversations = await getConversations()

  return (
    // Cancela os paddings do <main> (px-8, pb-12) e a margem de pt-24 para
    // encostar no header (h-16 = 4rem). Ocupa a altura de 100vh - 4rem.
    <div className="-mt-8 -mx-8 -mb-12 h-[calc(100vh-4rem)]">
      <AtendimentoShell
        initialConversations={conversations}
        companyId={companyId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
