"use client"

import * as React from "react"
import { Eye, EyeOff, CircleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type InputFieldProps = React.ComponentProps<"input"> & {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

function InputField({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  className,
  id,
  type,
  ...props
}: InputFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const isPassword = type === "password"
  const fallbackId = React.useId()
  const inputId = id ?? fallbackId
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {leftIcon}
          </span>
        )}

        <Input
          id={inputId}
          type={resolvedType}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          className={cn(
            leftIcon && "pl-9",
            (rightIcon || isPassword) && "pr-9",
            className
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : rightIcon ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <CircleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {!error && helper && (
        <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  )
}

export { InputField }
