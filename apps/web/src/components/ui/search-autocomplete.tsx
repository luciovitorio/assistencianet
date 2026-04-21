'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export interface SearchAutocompleteProps<TOption extends { id: string }> {
  options: TOption[]
  value: string
  onChange: (value: string) => void
  onSelectOption?: (option: TOption) => void
  placeholder: string
  error?: string
  getOptionLabel: (option: TOption) => string
  getOptionSearchText?: (option: TOption) => string
  filterOption?: (option: TOption, normalizedSearch: string, rawSearch: string) => boolean
  searchOptions?: (search: string) => Promise<TOption[]>
  renderOption?: (option: TOption) => React.ReactNode
  emptyMessage?: (search: string) => string
  createLabel?: (search: string) => string
  onCreate?: (search: string) => void
  maxResults?: number
  searchDebounceMs?: number
  loadingMessage?: string
  className?: string
}

export function SearchAutocomplete<TOption extends { id: string }>({
  options,
  value,
  onChange,
  onSelectOption,
  placeholder,
  error,
  getOptionLabel,
  getOptionSearchText = getOptionLabel,
  filterOption,
  searchOptions,
  renderOption,
  emptyMessage = (search) =>
    search.trim() ? `Nenhum resultado encontrado para "${search}".` : 'Nenhum item cadastrado.',
  createLabel,
  onCreate,
  maxResults = 10,
  searchDebounceMs = 250,
  loadingMessage = 'Buscando...',
  className,
}: SearchAutocompleteProps<TOption>) {
  const [search, setSearch] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [remoteOptions, setRemoteOptions] = React.useState<TOption[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})
  const searchRequestId = React.useRef(0)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isRemoteSearch = !!searchOptions

  const mergedOptions = React.useMemo(
    () =>
      Array.from(
        new Map([...options, ...remoteOptions].map((option) => [option.id, option])).values(),
      ),
    [options, remoteOptions],
  )

  const selectedOption = React.useMemo(
    () => mergedOptions.find((option) => option.id === value) ?? null,
    [mergedOptions, value],
  )

  const normalizedSearch = normalizeSearch(search.trim())
  const visibleOptions = isRemoteSearch
    ? remoteOptions.slice(0, maxResults)
    : normalizedSearch
      ? options
        .filter((option) =>
          filterOption
            ? filterOption(option, normalizedSearch, search)
            : normalizeSearch(getOptionSearchText(option)).includes(normalizedSearch),
        )
        .slice(0, maxResults)
      : options.slice(0, Math.min(8, maxResults))

  const updatePosition = React.useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [])

  React.useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) return
    const sync = () => updatePosition()
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [isOpen, updatePosition])

  React.useEffect(() => {
    if (!isOpen || !searchOptions) return

    const requestId = searchRequestId.current + 1
    searchRequestId.current = requestId
    setIsSearching(true)

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchOptions(search)
        if (searchRequestId.current === requestId) {
          setRemoteOptions(results)
        }
      } catch {
        if (searchRequestId.current === requestId) {
          setRemoteOptions([])
        }
      } finally {
        if (searchRequestId.current === requestId) {
          setIsSearching(false)
        }
      }
    }, searchDebounceMs)

    return () => window.clearTimeout(timer)
  }, [isOpen, search, searchDebounceMs, searchOptions])

  const displayValue = selectedOption ? getOptionLabel(selectedOption) : search

  const dropdown =
    isOpen && typeof window !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="overflow-hidden rounded-xl bg-popover ring-1 ring-foreground/10 shadow-xl shadow-slate-950/10"
          >
            <div className="max-h-72 overflow-y-auto">
              {isSearching ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">{loadingMessage}</p>
              ) : visibleOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyMessage(search)}
                </p>
              ) : (
                visibleOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onSelectOption?.(option)
                      onChange(option.id)
                      setSearch('')
                      setIsOpen(false)
                    }}
                  >
                    <span>{renderOption ? renderOption(option) : getOptionLabel(option)}</span>
                    {value === option.id && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                ))
              )}
            </div>
            {onCreate && createLabel && (
              <div className="border-t">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    setIsOpen(false)
                    onCreate(search)
                  }}
                >
                  <Plus className="size-4 shrink-0" />
                  {createLabel(search)}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div ref={wrapperRef} className={cn('relative', className)}>
        <div
          className={cn(
            'relative flex h-11 items-center rounded-xl border bg-background shadow-sm shadow-slate-950/5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            error ? 'border-destructive ring-3 ring-destructive/20' : 'border-input',
          )}
        >
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(event) => {
              setSearch(event.target.value)
              if (value) onChange('')
              if (!isOpen) {
                updatePosition()
                setIsOpen(true)
              }
            }}
            onFocus={() => {
              updatePosition()
              setIsOpen(true)
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent py-1 pl-10 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            autoComplete="off"
          />
          {(selectedOption || search) && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
                setSearch('')
                setIsOpen(false)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              className="absolute right-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {dropdown}
    </>
  )
}
