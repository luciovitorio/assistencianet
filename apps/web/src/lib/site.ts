export const siteConfig = {
  name: 'SmartConserto',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://smartconserto.com.br').replace(/\/$/, ''),
  description:
    'Sistema de gestão para assistências técnicas com ordens de serviço, clientes, estoque, financeiro e notificações automáticas pelo WhatsApp.',
  contactEmail: 'contato@smartconserto.com.br',
}
