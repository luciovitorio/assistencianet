export const siteConfig = {
  name: 'SmartConserto',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://smartconserto.com.br').replace(/\/$/, ''),
  description:
    'Sistema de gestão para assistências técnicas com ordens de serviço, clientes, estoque, financeiro e notificações automáticas pelo WhatsApp.',
  contactEmail: 'contato@smartconserto.com.br',
  whatsappUrl:
    'https://wa.me/5521993162887?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20o%20SmartConserto.',
}
