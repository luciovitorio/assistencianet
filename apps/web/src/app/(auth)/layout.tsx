import Image from 'next/image'
import loginIllustration from '../../../public/image-login-sem-fundo.svg'
import { BrandMark } from '@/components/brand-mark'
import s from '../landing.module.css'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-800 p-12 text-white">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Link href="/" className={s['nav-logo']}>
            <div className={s['nav-logo-mark']} aria-hidden="true">
              <BrandMark />
            </div>
            <span className={s['nav-logo-text']}>
              Smart<span>Conserto</span>
            </span>
          </Link>
        </div>
        <Image
          src={loginIllustration}
          alt=""
          aria-hidden="true"
          className="mx-auto w-full max-w-sm drop-shadow-2xl"
        />

        <blockquote className="space-y-2">
          <p className="text-lg leading-relaxed">
            &quot;Gerencie suas ordens de serviço, clientes e financeiro em um só lugar — simples e
            objetivo.&quot;
          </p>
          <footer className="text-white/50 text-sm">SmartConserto SaaS</footer>
        </blockquote>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
