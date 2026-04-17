import * as React from "react"
import Link, { type LinkProps } from "next/link"
import { ArrowRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type AppLinkVariant = "inline" | "muted" | "standalone" | "back"

type AppLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: AppLinkVariant
    children: React.ReactNode
  }

const variantClasses: Record<AppLinkVariant, string> = {
  // Azul primário, sublinhado no hover — para links dentro de texto
  inline:
    "text-primary font-medium underline-offset-4 hover:underline visited:text-primary/70 transition-colors",
  // Cinza suave — para ações secundárias (ex: "Esqueceu a senha?")
  muted:
    "text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline transition-colors",
  // Azul bold com seta → — para navegação destacada
  standalone:
    "inline-flex items-center gap-1 text-primary font-semibold underline-offset-4 hover:underline transition-colors",
  // Voltar com ‹ — para navegação de retorno
  back:
    "inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors",
}

function AppLink({ variant = "inline", className, children, ...props }: AppLinkProps) {
  return (
    <Link className={cn(variantClasses[variant], className)} {...props}>
      {variant === "back" && <ChevronLeft className="size-3.5" />}
      {children}
      {variant === "standalone" && <ArrowRight className="size-3.5" />}
    </Link>
  )
}

export { AppLink, type AppLinkVariant }
