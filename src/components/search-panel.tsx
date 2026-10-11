'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/easyui/button'
import { UpgradeDialog } from '@/components/plan-indicator'
import { PillNavigation } from '@/components/ui/pill-navigation'
import type { SearchFilters } from '@/lib/saved-briefs/schema'
import { formatFilterValue } from '@/lib/search/format'

const PAGE_SIZE = 20

const FILTERS: { key: keyof SearchFilters; label: string }[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'role', label: 'Role' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'years_experience', label: 'Experience' },
  { key: 'open_to_work', label: 'Open to work' },
  { key: 'current_title', label: 'Current title' },
  { key: 'current_company', label: 'Current company' },
  { key: 'company', label: 'Previous company' },
  { key: 'company_type', label: 'Company type' },
  { key: 'title', label: 'Job title' },
  { key: 'school', label: 'School' },
  { key: 'degree', label: 'Degree' },
  { key: 'field', label: 'Field' },
]

type Candidate = {
  id: string
  full_name: string
  years_experience: number | null
  current_title: string | null
  current_company: string | null
}

type SearchPayload = {
  search_id: string
  filters: SearchFilters
  unsupported?: string[]
  total: number
  results: Candidate[]
  page: number
}

const pill =
  'flex h-12 items-center gap-3 rounded-full border border-white/15 bg-black px-4 transition-[width,border-color] duration-300 focus-within:border-white/40'
const pillInput = 'min-w-0 flex-1 bg-transparent text-lg text-[var(--paper)] outline-none placeholder:text-[var(--paper)]/40'

function pageItems(page: number, count: number) {
  const start = count <= 12 ? 1 : Math.max(1, Math.min(page - 4, count - 11))
  const end = Math.min(count, start + 11)
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const n = String(start + i)
    return { id: n, label: n }
  })
}

function activeCount(value: unknown) {
  if (value == null) return 0
  return Array.isArray(value) ? value.length : 1
}

function currentWork(c: Candidate) {
  if (c.current_title && c.current_company) return `${c.current_title} at ${c.current_company}`
  return c.current_title || c.current_company || 'No current role'
}

export function SearchBox() {
  const router = useRouter()
  const [brief, setBrief] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [upgrade, setUpgrade] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = brief.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief: text }),
      })
      if (res.status === 402) {
        setUpgrade(true)
        router.refresh()
        return
      }
      if (res.status === 422) throw new Error('Could not understand that brief.')
      if (res.status === 502) throw new Error('Search is unavailable.')
      if (!res.ok) throw new Error('Search failed.')
      const data = (await res.json()) as { search_id: string }
      router.push(`/search/${data.search_id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="mt-10 flex items-center gap-4" onSubmit={(e) => void onSubmit(e)}>
        <div className={`${pill} min-w-0 flex-1 sm:w-64 sm:flex-none sm:focus-within:w-96`}>
          <Search className="size-5 shrink-0 text-[var(--paper)]/50" />
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Senior React engineers in New York"
            aria-label="Search briefs"
            className={pillInput}
          />
        </div>
        <Button type="submit" size="sm" isLoading={busy} className="shrink-0 rounded-full" disabled={!brief.trim()}>
          Search
        </Button>
      </form>
      {error && <p className="mt-4 text-base text-[var(--bamboo)]">{error}</p>}
      <UpgradeDialog open={upgrade} onClose={() => setUpgrade(false)} />
    </>
  )
}

export function SearchResults({ searchId }: { searchId: string }) {
  const router = useRouter()
  const [search, setSearch] = useState<SearchPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [upgrade, setUpgrade] = useState(false)

  async function read(res: Response) {
    if (res.status === 402) {
      setUpgrade(true)
      router.refresh()
      throw new Error('quota')
    }
    if (res.status === 401) {
      router.push('/')
      throw new Error('quota')
    }
    if (!res.ok) throw new Error(res.status === 404 ? 'Search not found.' : 'Search failed.')
    return (await res.json()) as SearchPayload
  }

  async function loadPage(id: string, page: number) {
    setBusy(true)
    setError(null)
    try {
      setSearch(await read(await fetch(`/api/search/${id}?page=${page}`, { credentials: 'include' })))
    } catch (err) {
      if (err instanceof Error && err.message !== 'quota') setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function research(filters: SearchFilters, unsupported: string[]) {
    setBusy(true)
    setError(null)
    try {
      const body = unsupported.length ? { ...filters, unsupported } : filters
      const data = await read(await fetch('/api/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filters: body }),
      }))
      router.replace(`/search/${data.search_id}`)
      setSearch(data)
    } catch (err) {
      if (err instanceof Error && err.message !== 'quota') setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadPage(searchId, 1)
    // load when the route id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId])

  const filters = search?.filters ?? {}
  const unsupported = search?.unsupported ?? []
  const setCount = FILTERS.filter((f) => activeCount(filters[f.key]) > 0).length
  const pages = search ? Math.ceil(search.total / PAGE_SIZE) : 0

  return (
    <>
      <SearchBox />
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-black px-3 text-sm text-[var(--paper)]">
          <SlidersHorizontal className="size-4" />
          Filters
          {setCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[#d4654f] text-xs text-white">{setCount}</span>
          )}
        </span>
        {FILTERS.map((f) => {
          const n = activeCount(filters[f.key])
          const value = filters[f.key]
          return (
            <button
              key={f.key}
              type="button"
              disabled={n === 0 || busy}
              title={n ? formatFilterValue(value) : undefined}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm text-[var(--paper)] enabled:hover:bg-white/10 disabled:cursor-default"
              onClick={() => {
                const next = { ...filters }
                delete next[f.key]
                void research(next, unsupported)
              }}
            >
              {f.label}
              {n > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#d4654f] text-xs text-white">{n}</span>
              )}
            </button>
          )
        })}
        {unsupported.length > 0 && (
          <span className="inline-flex h-9 items-center rounded-full border border-[var(--bamboo)]/50 px-3 text-sm text-[var(--bamboo)]" title={unsupported.join('; ')}>
            Not in the data
            <span className="ml-2 flex size-5 items-center justify-center rounded-full bg-[#d4654f] text-xs text-white">{unsupported.length}</span>
          </span>
        )}
        {setCount > 0 && (
          <button
            type="button"
            className="ml-auto text-sm text-[var(--paper)]/70 hover:text-[var(--paper)]"
            onClick={() => void research({}, [])}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="mt-6 text-base text-[var(--bamboo)]">{error}</p>}

      {search && (
        <div className="mt-10">
          <p className="text-sm text-[var(--paper)]/60">{search.total} candidates</p>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {search.results.map((c) => (
              <li key={c.id}>
                <Link href={`/people/${c.id}`} className="grid gap-1 py-4 sm:grid-cols-[1.4fr_8rem_1.6fr] sm:items-baseline sm:gap-6">
                  <span className="text-lg font-medium">{c.full_name}</span>
                  <span className="text-base text-[var(--paper)]/70">
                    {c.years_experience == null ? 'Years unknown' : `${c.years_experience} years`}
                  </span>
                  <span className="text-base text-[var(--paper)]/80">{currentWork(c)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {search.results.length === 0 && <p className="mt-8 text-[var(--paper)]/60">No candidates match.</p>}
          {pages > 1 && (
            <PillNavigation
              className="mt-6"
              items={pageItems(search.page, pages)}
              value={String(search.page)}
              onChange={(id) => void loadPage(search.search_id, Number(id))}
            />
          )}
        </div>
      )}
      <UpgradeDialog open={upgrade} onClose={() => setUpgrade(false)} />
    </>
  )
}
