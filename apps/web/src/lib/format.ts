const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (isNaN(date.getTime())) return '—'
  return dateTimeFormatter.format(date)
}
