"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Loader2 } from "lucide-react"

import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

type ButtonProps = ButtonPrimitive.Props &
  ButtonVariantProps & {
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Carregando...</span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button }
