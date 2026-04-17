import Link from 'next/link'
import { LandingHeader } from './_components/landing-header'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-xl">
          <h1 className="text-4xl font-bold tracking-tight">
            Gerencie sua assistência técnica
          </h1>
          <p className="text-muted-foreground text-lg">
            Ordens de serviço, clientes e financeiro em um só lugar — simples e objetivo.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 h-11 text-base font-medium transition-colors hover:bg-primary/90"
            >
              Começar grátis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 h-11 text-base font-medium transition-colors hover:bg-muted"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
