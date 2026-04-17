import Image from 'next/image'
import loginIllustration from '../../../public/image-login-sem-fundo.svg'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="size-8 rounded-md bg-primary flex items-center justify-center text-sm font-black text-white">
            A
          </span>
          AssistênciaNet
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
          <footer className="text-white/50 text-sm">AssistênciaNet SaaS</footer>
        </blockquote>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
