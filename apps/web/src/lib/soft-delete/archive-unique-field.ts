const normalizeForArchive = (value: string | null | undefined) => value?.trim() || ''

export const buildArchivedUniqueFieldValue = (
  value: string | null | undefined,
  entityId: string,
  deletedAt: string,
) => {
  const normalized = normalizeForArchive(value)
  if (!normalized) {
    return null
  }

  return `${normalized} [deleted:${deletedAt}:${entityId}]`
}
