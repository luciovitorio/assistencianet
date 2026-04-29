import { redirect } from 'next/navigation'
import { getBotMenuItems } from '@/app/actions/bot-menu'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'
import { BotMenuManager } from './_components/bot-menu-manager'

export default async function ConfiguracoesBotPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  try {
    await getAdminContext('configuracoes')
  } catch {
    redirect('/dashboard')
  }

  const result = await getBotMenuItems()
  const items = 'data' in result ? result.data : []

  return (
    <div className="space-y-6">
      <BotMenuManager initialItems={items} />
    </div>
  )
}
