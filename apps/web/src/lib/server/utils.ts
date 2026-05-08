interface AddressFields {
  street?: string | null
  number?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

export const normalizeOptionalValue = (value: string | null | undefined): string | null => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export const buildAddress = ({
  street,
  number,
  complement,
  city,
  state,
  zip_code,
}: AddressFields): string | null => {
  const line = [street?.trim(), number?.trim()].filter(Boolean).join(', ')
  const location = [city?.trim(), state?.trim()].filter(Boolean).join(' - ')
  const parts = [
    line || null,
    complement?.trim() || null,
    location || null,
    zip_code?.trim() || null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : null
}

export const createUniqueIndexChecker =
  (indexName: string, errorMessage: string) =>
  (error: unknown): string | null => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes(indexName)
    ) {
      return errorMessage
    }
    return null
  }

export const extractActionError = (
  error: unknown,
  fallback: string,
  ...uniqueCheckers: Array<(e: unknown) => string | null>
): string => {
  for (const checker of uniqueCheckers) {
    const message = checker(error)
    if (message) return message
  }
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return fallback
}
