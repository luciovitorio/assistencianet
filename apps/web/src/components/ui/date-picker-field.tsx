'use client'

import * as React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, CircleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerFieldProps {
  label?: string
  helper?: string
  error?: string
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function DatePickerField({
  label,
  helper,
  error,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  className,
  disabled,
}: DatePickerFieldProps) {
  const id = React.useId()

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : undefined
  }, [value])

  const displayValue = selectedDate
    ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
    : null

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date ? format(date, 'yyyy-MM-dd') : '')
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium',
            error ? 'text-destructive' : 'text-foreground',
          )}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <Popover>
          <PopoverTrigger
            id={id}
            disabled={disabled}
            className={cn(
              'flex h-8 w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-sm transition-colors',
              'border-input bg-muted text-left font-normal focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              !displayValue && 'text-muted-foreground',
              selectedDate && 'pr-9',
              error && 'border-destructive ring-3 ring-destructive/20',
              className,
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{displayValue ?? placeholder}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={ptBR}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpar data"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <CircleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {!error && helper && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

export { DatePickerField }
