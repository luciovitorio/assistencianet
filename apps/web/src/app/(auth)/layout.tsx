import { BrandMark } from '@/components/brand-mark'
import { OsPreviewTicker } from '@/app/(auth)/os-preview-ticker'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden w-[480px] shrink-0 flex-col overflow-hidden bg-[#0F1B3D] p-12 lg:flex">
        {/* Gradient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[120px] -top-[180px] h-[500px] w-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,85,240,0.35) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[100px] -right-[100px] h-[350px] w-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,211,102,0.12) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 no-underline">
          <BrandMark className="h-9 w-9" aria-hidden="true" />
          <span className="text-[19px] font-extrabold tracking-tight text-white">
            Smart<span className="text-[#C7D7FD]">Conserto</span>
          </span>
        </Link>

        {/* Main content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center">
          {/* Live badge */}
          <div className="mb-7 inline-flex w-fit items-center gap-[7px] rounded-full border border-white/10 bg-white/[0.08] px-3 py-[5px] text-xs font-semibold text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
            Sistema online · Dados salvos em tempo real
          </div>

          <h2 className="mb-4 text-[38px] font-extrabold leading-[1.12] tracking-[-0.03em] text-white">
            Sua assistência<br />técnica sob{' '}
            <em className="not-italic text-[#C7D7FD]">controle total</em>
          </h2>

          <p className="mb-10 max-w-[340px] text-[15px] leading-[1.65] text-white/50">
            Gerencie OS, clientes, estoque e financeiro — com notificações automáticas pelo WhatsApp.
          </p>

          {/* Stats */}
          <div className="flex gap-5">
            <div className="flex-1 rounded-[10px] border border-white/10 bg-white/[0.06] px-[18px] py-3.5">
              <div className="text-[22px] font-extrabold tracking-tight text-white">
                +<span className="text-[#C7D7FD]">4.200</span>
              </div>
              <div className="mt-0.5 text-[11px] text-white/40">assistências ativas</div>
            </div>
            <div className="flex-1 rounded-[10px] border border-white/10 bg-white/[0.06] px-[18px] py-3.5">
              <div className="text-[22px] font-extrabold tracking-tight text-white">
                <span className="text-[#C7D7FD]">R$12M</span>
              </div>
              <div className="mt-0.5 text-[11px] text-white/40">em OS por mês</div>
            </div>
          </div>

          {/* Animated OS ticker */}
          <OsPreviewTicker />
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[12px] text-white/30">
          © 2026 SmartConserto · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-105">{children}</div>
      </div>
    </div>
  )
}
