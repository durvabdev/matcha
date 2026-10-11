'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type SavedBrief = {
  id: string
  brief: string
  filters: Record<string, unknown>
  created_at: string
  search_id: string | null
}

function Body({ brief, created_at }: Pick<SavedBrief, 'brief' | 'created_at'>) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <span className="min-w-0 flex-1 truncate text-2xl font-medium">{brief}</span>
      <span className="flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--powder)] px-5 text-lg font-medium text-[var(--paper)]">
        Edit
      </span>
      <time dateTime={created_at} className="flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--powder)] px-5 text-lg font-medium text-[var(--paper)]">
        {new Date(created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </time>
    </div>
  )
}

export function BriefCard({ brief: b }: { brief: SavedBrief }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const href = b.search_id ? `/search/${b.search_id}` : null

  async function open() {
    if (href) {
      router.push(href)
      return
    }
    setBusy(true)
    const body = Object.keys(b.filters).length > 0 ? { brief: b.brief, filters: b.filters } : { brief: b.brief }
    const res = await fetch('/api/search', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 402) {
      router.push('/402')
      return
    }
    if (!res.ok) {
      setBusy(false)
      return
    }
    const data = (await res.json()) as { search_id: string }
    router.push(`/search/${data.search_id}`)
  }

  return (
    <li className="rounded-2xl border border-[var(--paper)]/10 bg-white">
      {href ? (
        <Link href={href} className="focus-ring block rounded-2xl">
          <Body brief={b.brief} created_at={b.created_at} />
        </Link>
      ) : (
        <button type="button" disabled={busy} onClick={() => void open()} className="focus-ring block w-full rounded-2xl text-left">
          <Body brief={b.brief} created_at={b.created_at} />
        </button>
      )}
    </li>
  )
}
