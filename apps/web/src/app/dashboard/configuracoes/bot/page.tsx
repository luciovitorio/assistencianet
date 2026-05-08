import { redirect } from 'next/navigation'
import { getBotMenuItems } from '@/app/actions/bot-menu'
import { getBotMessages } from '@/app/actions/bot-messages'
import { getBotTriggerSettings } from '@/app/actions/bot-triggers'
import { getAdminContext } from '@/lib/auth/admin-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BotMenuManager } from './_components/bot-menu-manager'
import { BotMessagesForm } from './_components/bot-messages-form'
import { BotTriggersForm } from './_components/bot-triggers-form'

export default async function ConfiguracoesBotPage() {
  try {
    await getAdminContext('configuracoes')
  } catch {
    redirect('/dashboard')
  }

  const [menuResult, messagesResult, triggersResult] = await Promise.all([
    getBotMenuItems(),
    getBotMessages(),
    getBotTriggerSettings(),
  ])

  const items = 'data' in menuResult ? menuResult.data : []
  const messages = 'data' in messagesResult ? messagesResult.data : null
  const triggers = 'data' in triggersResult ? triggersResult.data : null

  return (
    <div className="space-y-6">
      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Menu interativo</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="triggers">Gatilhos</TabsTrigger>
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

        <TabsContent value="triggers" className="mt-6">
          {triggers ? (
            <BotTriggersForm initialSettings={triggers} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure a automação do WhatsApp antes de definir os gatilhos.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
