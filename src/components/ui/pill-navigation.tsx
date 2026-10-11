'use client'

import { cn } from '@/lib/utils'

export function PillNavigation({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <nav className={cn('flex flex-wrap gap-2', className)} aria-label="Pagination">
      {items.map((item) => {
        const current = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-current={current ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              'focus-ring rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              current
                ? 'bg-[var(--paper)] text-[var(--kiln)]'
                : 'bg-black/40 text-[var(--paper)]/80 hover:bg-black/60',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
