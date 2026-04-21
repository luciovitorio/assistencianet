"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  PlusCircle,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface DataTableFilterOption {
  value: string
  label: string
  count?: number
}

interface DataTableToolbarProps extends React.ComponentProps<"div"> {
  filters: React.ReactNode
  actions?: React.ReactNode
}

function DataTableToolbar({
  className,
  filters,
  actions,
  ...props
}: DataTableToolbarProps) {
  return (
    <div
      className={cn("mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between", className)}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {filters}
      </div>
      {actions ? (
        <div className="flex items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

interface DataTableSearchProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
}

function DataTableSearch({
  value,
  onChange,
  placeholder = "Filtrar...",
  className,
  disabled,
  ...props
}: DataTableSearchProps) {
  return (
    <div className={cn("relative w-full lg:max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 bg-background pl-9"
        disabled={disabled}
        {...props}
      />
    </div>
  )
}

interface DataTableFilterPopoverProps {
  title: string
  options: DataTableFilterOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
  onClear: () => void
  disabled?: boolean
}

function DataTableFilterPopover({
  title,
  options,
  selectedValues,
  onToggle,
  onClear,
  disabled = false,
}: DataTableFilterPopoverProps) {
  const [query, setQuery] = React.useState("")

  const visibleOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return options

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
          selectedValues.length > 0 && "border-solid border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <PlusCircle className="size-4" />
        <span>{title}</span>
        {selectedValues.length > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/12 px-1.5 py-0.5 text-xs font-semibold text-primary">
            {selectedValues.length}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 gap-0 p-0">
        <div className="border-b border-border p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={title}
              className="h-8 bg-background pl-9"
            />
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto px-2 py-1.5">
          {visibleOptions.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhuma opcao encontrada.
            </div>
          ) : (
            visibleOptions.map((option) => {
              const checked = selectedValues.includes(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`${title}: ${option.label}`}
                  onClick={() => onToggle(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                    checked && "bg-muted/70",
                  )}
                >
                  <Checkbox checked={checked} />
                  <span className="flex-1 text-sm font-medium text-foreground">{option.label}</span>
                  {typeof option.count === "number" ? (
                    <span className="text-sm text-muted-foreground">{option.count}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedValues.length === 0
              ? "Nenhum filtro aplicado"
              : `${selectedValues.length} selecionado(s)`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={selectedValues.length === 0}>
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DataTableCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}
      {...props}
    />
  )
}

interface DataTablePaginationProps {
  currentPage: number
  totalPages: number
  rowsPerPage: number
  onRowsPerPageChange: (value: number) => void
  onPageChange: (page: number) => void
  totalItems: number
  currentItemsCount: number
  rowsPerPageOptions?: number[]
  itemLabel?: string
}

function DataTablePagination({
  currentPage,
  totalPages,
  rowsPerPage,
  onRowsPerPageChange,
  onPageChange,
  totalItems,
  currentItemsCount,
  rowsPerPageOptions = [10, 25, 50],
  itemLabel = "registro",
}: DataTablePaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        Mostrando {currentItemsCount} de {totalItems} {itemLabel}(s)
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Linhas por pagina</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => onRowsPerPageChange(Number(value ?? String(rowsPerPageOptions[0] ?? 10)))}
          >
            <SelectTrigger aria-label="Linhas por pagina" className="h-9 min-w-16 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {rowsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm font-medium">
            Pagina {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title="Primeira pagina"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              title="Pagina anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              title="Proxima pagina"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Ultima pagina"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export interface DataTableColumnDef {
  id: string
  label: string
  locked?: boolean
  defaultVisible?: boolean
}

const COLUMN_VISIBILITY_COOKIE_PREFIX = "table-col:"
const COLUMN_VISIBILITY_COOKIE_VERSION = "v1"
const COLUMN_VISIBILITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function buildColumnDefaults(columns: DataTableColumnDef[]): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const column of columns) {
    next[column.id] = column.locked ? true : column.defaultVisible !== false
  }
  return next
}

function mergeSavedVisibility(
  defaults: Record<string, boolean>,
  columns: DataTableColumnDef[],
  saved: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  if (!saved) return defaults
  const next = { ...defaults }
  for (const column of columns) {
    if (column.locked) {
      next[column.id] = true
      continue
    }
    const value = saved[column.id]
    if (typeof value === "boolean") {
      next[column.id] = value
    }
  }
  return next
}

export function useTableColumnVisibility(
  tableKey: string,
  columns: DataTableColumnDef[],
  initialVisibility?: Record<string, boolean> | null,
) {
  const defaults = React.useMemo(() => buildColumnDefaults(columns), [columns])
  const cookieName = `${COLUMN_VISIBILITY_COOKIE_PREFIX}${tableKey}:${COLUMN_VISIBILITY_COOKIE_VERSION}`

  const [visibility, setVisibility] = React.useState<Record<string, boolean>>(() =>
    mergeSavedVisibility(defaults, columns, initialVisibility),
  )

  const persist = React.useCallback(
    (next: Record<string, boolean> | null) => {
      if (typeof document === "undefined") return
      try {
        if (next === null) {
          document.cookie = `${cookieName}=; path=/; max-age=0; samesite=lax`
        } else {
          const encoded = encodeURIComponent(JSON.stringify(next))
          document.cookie = `${cookieName}=${encoded}; path=/; max-age=${COLUMN_VISIBILITY_COOKIE_MAX_AGE}; samesite=lax`
        }
      } catch {
        // Cookies may be blocked; keep in-memory state.
      }
    },
    [cookieName],
  )

  const toggle = React.useCallback(
    (id: string) => {
      const column = columns.find((c) => c.id === id)
      if (!column || column.locked) return
      setVisibility((current) => {
        const next = { ...current, [id]: !(current[id] !== false) }
        persist(next)
        return next
      })
    },
    [columns, persist],
  )

  const reset = React.useCallback(() => {
    setVisibility(defaults)
    persist(null)
  }, [defaults, persist])

  const isVisible = React.useCallback(
    (id: string) => visibility[id] !== false,
    [visibility],
  )

  return { visibility, toggle, reset, isVisible }
}

interface DataTableColumnToggleProps {
  columns: DataTableColumnDef[]
  visibility: Record<string, boolean>
  onToggle: (id: string) => void
  onReset: () => void
}

function DataTableColumnToggle({
  columns,
  visibility,
  onToggle,
  onReset,
}: DataTableColumnToggleProps) {
  const toggleable = React.useMemo(() => columns.filter((c) => !c.locked), [columns])
  const visibleCount = toggleable.filter((c) => visibility[c.id] !== false).length
  const isCustomized = toggleable.some(
    (c) => (visibility[c.id] !== false) !== (c.defaultVisible !== false),
  )

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          isCustomized && "border-solid border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <Columns3 className="size-4" />
        <span>Colunas</span>
        <span
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
            isCustomized
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {visibleCount}/{toggleable.length}
        </span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 gap-0 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Exibir colunas
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto px-2 py-1.5">
          {toggleable.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhuma coluna configurável.
            </div>
          ) : (
            toggleable.map((column) => {
              const checked = visibility[column.id] !== false
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => onToggle(column.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                    checked && "bg-muted/70",
                  )}
                >
                  <Checkbox checked={checked} />
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {column.label}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
          <span className="text-xs text-muted-foreground">
            {visibleCount} de {toggleable.length} visíveis
          </span>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={!isCustomized}>
            Redefinir
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export {
  DataTableCard,
  DataTableColumnToggle,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
}
