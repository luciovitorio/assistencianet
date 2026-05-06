import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  applicationName: 'SmartConserto',
  title: 'SmartConserto',
  description: 'Sistema de gestão para assistências técnicas',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased [scrollbar-gutter:stable]`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TooltipProvider>
          {children}
          <CookieConsentBanner />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  )
}
