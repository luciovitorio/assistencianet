'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface StepperInputProps {
  value: string | number
  onChange: (value: string | number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
  helper?: string
  error?: string
  className?: string
}

export function StepperInput({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label,
  helper,
  error,
  className,
}: StepperInputProps) {
  const currentQty = Number(value) || min

  function decrement() {
    if (currentQty > min) onChange(currentQty - 1)
  }

  function increment() {
    if (max !== undefined && currentQty >= max) return
    onChange(currentQty + 1)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div
        className={cn(
          'flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent',
          disabled && 'opacity-50',
        )}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || currentQty <= min}
          tabIndex={-1}
          className="flex w-9 shrink-0 items-center justify-center border-r border-input text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={String(currentQty)}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={increment}
          disabled={disabled || (max !== undefined && currentQty >= max)}
          tabIndex={-1}
          className="flex w-9 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {(helper || error) && (
        <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {error ?? helper}
        </p>
      )}
    </div>
  )
}
