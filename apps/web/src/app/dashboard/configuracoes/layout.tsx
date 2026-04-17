import { SettingsSectionNav } from './_components/settings-section-nav'

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <SettingsSectionNav />
      {children}
    </div>
  )
}
