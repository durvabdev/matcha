'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import { Button } from '@/components/easyui/button'
import { UpgradeDialog } from '@/components/plan-indicator'
import { PillNavigation } from '@/components/ui/pill-navigation'
import type { SearchFilters } from '@/lib/saved-briefs/schema'

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
  'flex h-12 items-center gap-3 rounded-full border border-[var(--paper)]/15 bg-white px-4 transition-[width,border-color] duration-300 focus-within:border-[var(--paper)]/40'
const pillInput = 'w-full min-w-0 flex-1 bg-transparent text-lg text-[var(--paper)] outline-none placeholder:text-[var(--paper)]/40'

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

const ENUMS: Partial<Record<keyof SearchFilters, readonly string[]>> = {
  seniority: ['junior', 'mid', 'senior', 'staff'],
  company_type: ['startup', 'enterprise'],
  degree: ['BA', 'BS', 'MBA', 'MS', 'PhD'],
}
const YEAR_MAX = 30
const YEAR_OPEN = { min: 0, max: YEAR_MAX }

function yearsDraft(value: unknown) {
  const list = Array.isArray(value) ? value : value != null ? [value] : []
  let min = 0
  let max = YEAR_MAX
  for (const row of list) {
    if (!row || typeof row !== 'object' || !('operator' in row) || !('value' in row)) continue
    const { operator, value: n } = row as { operator: string; value: number }
    if (typeof n !== 'number') continue
    if (operator === 'gte' || operator === 'gt') min = Math.min(n, YEAR_MAX)
    else if (operator === 'lte' || operator === 'lt') max = Math.min(n, YEAR_MAX)
    else if (operator === 'eq') {
      min = Math.min(n, YEAR_MAX)
      max = min
    }
  }
  return min <= max ? { min, max } : { min: max, max: min }
}

function yearsFilter(range: { min: number; max: number }) {
  if (range.min <= 0 && range.max >= YEAR_MAX) return undefined
  if (range.min <= 0) return { operator: 'lte' as const, value: range.max }
  if (range.max >= YEAR_MAX) return { operator: 'gte' as const, value: range.min }
  return [
    { operator: 'gte' as const, value: range.min },
    { operator: 'lte' as const, value: range.max },
  ]
}

function yearsLabel(range: { min: number; max: number }) {
  if (range.min <= 0 && range.max >= YEAR_MAX) return 'Anything'
  if (range.min <= 0) return `Up to ${range.max} years`
  if (range.max >= YEAR_MAX) return `${range.min}+ years`
  if (range.min === range.max) return `${range.min} years`
  return `${range.min}–${range.max} years`
}

const rangeInput = 'years-range absolute inset-0 w-full'

function textDraft(key: keyof SearchFilters, value: unknown) {
  if (value == null) return ''
  if (key === 'skills' && Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : ''
}

function editedValue(key: keyof SearchFilters, draft: string, years: { min: number; max: number }) {
  if (key === 'skills') {
    const skills = draft.split(',').map((s) => s.trim().slice(0, 50)).filter(Boolean).slice(0, 20)
    return skills.length ? skills : undefined
  }
  if (key === 'years_experience') return yearsFilter(years)
  if (ENUMS[key]) return ENUMS[key]!.includes(draft) ? draft : undefined
  const max = key === 'city' || key === 'state' || key === 'country' ? 100 : 200
  const text = draft.trim().slice(0, max)
  return text || undefined
}

const chip = 'inline-flex h-9 max-w-full items-center gap-2 rounded-full border px-3 text-sm'
const chipOff = 'border-[var(--paper)]/15 bg-[var(--paper)]/5 text-[var(--paper)]'
const chipOn = 'border-[#173028] bg-[#173028] font-semibold text-white'

function FilterPill({
  filterKey,
  label,
  value,
  busy,
  open,
  onToggle,
  onApply,
}: {
  filterKey: keyof SearchFilters
  label: string
  value: unknown
  busy: boolean
  open: boolean
  onToggle: () => void
  onApply: (next: unknown) => void
}) {
  const [draft, setDraft] = useState('')
  const [years, setYears] = useState(YEAR_OPEN)
  const on = filterKey === 'open_to_work' ? value === true : value != null

  if (filterKey === 'role') {
    return (
      <span className={`${chip} ${on ? chipOn : chipOff}`}>
        {label}
      </span>
    )
  }

  if (filterKey === 'open_to_work') {
    return (
      <button
        type="button"
        disabled={busy}
        aria-pressed={on}
        className={`${chip} ${on ? chipOn : `${chipOff} enabled:hover:bg-[var(--paper)]/10`}`}
        onClick={() => onApply(on ? undefined : true)}
      >
        {label}
      </button>
    )
  }

  function toggle() {
    setDraft(textDraft(filterKey, value))
    setYears(yearsDraft(value))
    onToggle()
  }

  const options = ENUMS[filterKey]
  const field = 'w-full rounded-lg border border-[var(--paper)]/15 bg-white px-2 py-1.5 text-sm text-[var(--paper)] outline-none'

  return (
    <span className="relative">
      <button type="button" disabled={busy} className={`${chip} ${on ? chipOn : `${chipOff} enabled:hover:bg-[var(--paper)]/10`}`} onClick={toggle}>
        {label}
      </button>
      {open && (
        <form
          className={`absolute left-0 top-11 z-20 rounded-xl border border-[var(--paper)]/15 bg-white p-3 shadow-xl ${filterKey === 'years_experience' ? 'w-72' : 'w-64'}`}
          onSubmit={(e) => {
            e.preventDefault()
            onApply(editedValue(filterKey, draft, years))
          }}
        >
          {filterKey === 'years_experience' ? (
            <div>
              <p className="text-sm text-[var(--paper)]">{yearsLabel(years)}</p>
              <div className="relative mt-3 h-5">
                <div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-[var(--paper)]/15" />
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-[var(--paper)]"
                  style={{ left: `${(years.min / YEAR_MAX) * 100}%`, right: `${100 - (years.max / YEAR_MAX) * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={YEAR_MAX}
                  value={years.min}
                  aria-label="Minimum years of experience"
                  className={rangeInput}
                  style={{ zIndex: years.min > YEAR_MAX - years.max ? 2 : 1 }}
                  onChange={(e) => setYears((r) => ({ ...r, min: Math.min(Number(e.target.value), r.max) }))}
                />
                <input
                  type="range"
                  min={0}
                  max={YEAR_MAX}
                  value={years.max}
                  aria-label="Maximum years of experience"
                  className={rangeInput}
                  style={{ zIndex: 3 }}
                  onChange={(e) => setYears((r) => ({ ...r, max: Math.max(Number(e.target.value), r.min) }))}
                />
              </div>
            </div>
          ) : options ? (
            <select className={field} value={draft} aria-label={label} onChange={(e) => setDraft(e.target.value)}>
              <option value="">Any</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input className={field} value={draft} aria-label={label} placeholder={filterKey === 'skills' ? 'Swift, React' : label} onChange={(e) => setDraft(e.target.value)} />
          )}
          <div className="mt-3 flex gap-3">
            <button type="submit" className="text-sm text-[var(--paper)]">Apply</button>
            {value != null && (
              <button type="button" className="text-sm text-[var(--paper)]/70" onClick={() => onApply(undefined)}>Clear</button>
            )}
          </div>
        </form>
      )}
    </span>
  )
}

export function SearchBox({ fullWidth = false }: { fullWidth?: boolean }) {
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
      <form className="mt-10 flex w-full min-w-0 max-w-full items-center gap-4" onSubmit={(e) => void onSubmit(e)}>
        <div className={`${pill} w-auto min-w-0 flex-1 basis-0 ${fullWidth ? '' : 'sm:w-64 sm:flex-none sm:basis-auto sm:focus-within:w-96'}`}>
          <Search className="size-5 shrink-0 text-[var(--paper)]/50" />
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Senior React engineers in New York"
            aria-label="Search briefs"
            className={pillInput}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          isLoading={busy}
          className="shrink-0 rounded-full"
          disabled={!brief.trim()}
          leftIcon={<ThinkingOrb state="searching" size={20} theme="dark" />}
        >
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
  const [live, setLive] = useState<{ filters: SearchFilters; unsupported: string[] } | null>(null)
  const [openFilter, setOpenFilter] = useState<keyof SearchFilters | null>(null)

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

  async function fetchPage(id: string, page: number, preview: { filters: SearchFilters; unsupported: string[] } | null) {
    if (preview) {
      const body = preview.unsupported.length ? { ...preview.filters, unsupported: preview.unsupported } : preview.filters
      return read(await fetch('/api/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filters: body, preview: true, page }),
      }))
    }
    return read(await fetch(`/api/search/${id}?page=${page}`, { credentials: 'include' }))
  }

  async function loadPage(id: string, page: number) {
    setBusy(true)
    setError(null)
    try {
      setSearch(await fetchPage(id, page, live))
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
      const data = await fetchPage(searchId, 1, { filters, unsupported })
      setLive({ filters, unsupported })
      setSearch({ ...data, search_id: searchId })
    } catch (err) {
      if (err instanceof Error && err.message !== 'quota') setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setLive(null)
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        setSearch(await fetchPage(searchId, 1, null))
      } catch (err) {
        if (err instanceof Error && err.message !== 'quota') setError(err.message)
      } finally {
        setBusy(false)
      }
    })()
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
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--paper)]/15 bg-white px-3 text-sm text-[var(--paper)]">
          <SlidersHorizontal className="size-4" />
          Filters
          {setCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[#d4654f] text-xs text-white">{setCount}</span>
          )}
        </span>
        {FILTERS.map((f) => (
          <FilterPill
            key={f.key}
            filterKey={f.key}
            label={f.label}
            value={filters[f.key]}
            busy={busy}
            open={openFilter === f.key}
            onToggle={() => setOpenFilter((k) => (k === f.key ? null : f.key))}
            onApply={(next) => {
              const updated = { ...filters }
              if (next === undefined) delete updated[f.key]
              else Object.assign(updated, { [f.key]: next })
              setOpenFilter(null)
              void research(updated, unsupported)
            }}
          />
        ))}
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
          <ul className="mt-4 divide-y divide-[var(--paper)]/10 border-y border-[var(--paper)]/10">
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
              className="mt-6 w-full justify-center"
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
