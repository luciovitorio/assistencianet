export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b px-6 py-4 flex items-center gap-2">
        <span className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-black">
          A
        </span>
        <span className="font-bold text-sm">AssistênciaNet</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
