export function formatFilterValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatFilterValue).join(', ')
  if (value && typeof value === 'object' && 'operator' in value && 'value' in value) {
    const row = value as { operator: unknown; value: unknown }
    return `${String(row.operator)} ${formatFilterValue(row.value)}`
  }
  return String(value)
}

export function formatFilterChip(key: string, value: unknown) {
  return `${key.replaceAll('_', ' ')}: ${formatFilterValue(value)}`
}
