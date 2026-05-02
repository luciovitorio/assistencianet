import { redirect } from 'next/navigation'
import { getBotMenuItems } from '@/app/actions/bot-menu'
import { getBotMessages } from '@/app/actions/bot-messages'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BotMenuManager } from './_components/bot-menu-manager'
import { BotMessagesForm } from './_components/bot-messages-form'

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

  const [menuResult, messagesResult] = await Promise.all([
    getBotMenuItems(),
    getBotMessages(),
  ])

  const items = 'data' in menuResult ? menuResult.data : []
  const messages = 'data' in messagesResult ? messagesResult.data : null

  return (
    <div className="space-y-6">
      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Menu interativo</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-6">
          <BotMenuManager initialItems={items} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          {messages ? (
            <BotMessagesForm initialMessages={messages} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure a automação do WhatsApp antes de personalizar as mensagens.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
