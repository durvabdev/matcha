'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import { logout } from '@/app/actions'
import { Button } from '@/components/easyui/button'
import { PillNavigation } from '@/components/ui/pill-navigation'
import type { SearchFilters } from '@/lib/saved-briefs/schema'
import { STATE_CODES, STATE_LABEL } from '@/lib/search/states'

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
  brief?: string | null
  filters: SearchFilters
  unsupported?: string[]
  total: number
  results: Candidate[]
  page: number
}

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
  city: ['Atlanta', 'Austin', 'Boston', 'Chicago', 'Denver', 'Los Angeles', 'Miami', 'New York', 'San Francisco', 'Seattle'],
  state: STATE_CODES,
  country: ['US'],
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
  return typeof value === 'string' ? value : ''
}

function withSkill(list: string[], raw: string) {
  const skill = raw.trim().slice(0, 50)
  if (!skill || list.length >= 20 || list.some((s) => s.toLowerCase() === skill.toLowerCase())) return list
  return [...list, skill]
}

function editedValue(key: keyof SearchFilters, draft: string, years: { min: number; max: number }) {
  if (key === 'years_experience') return yearsFilter(years)
  if (ENUMS[key]) return ENUMS[key]!.includes(draft) ? draft : undefined
  const max = key === 'city' || key === 'state' || key === 'country' ? 100 : 200
  const text = draft.trim().slice(0, max)
  return text || undefined
}

const chip = 'inline-flex h-9 max-w-full items-center gap-2 rounded-full border px-3 text-sm'
const chipOff = 'border-[var(--paper)]/15 bg-[var(--paper)]/5 text-[var(--paper)]'
const chipOn = 'border-[var(--paper)] bg-[var(--powder)] font-semibold text-[var(--paper)]'

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
  const [skills, setSkills] = useState<string[]>([])
  const [years, setYears] = useState(YEAR_OPEN)
  const on = filterKey === 'open_to_work' ? value === true : value != null

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
    setSkills(filterKey === 'skills' && Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : [])
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
          className={`absolute left-0 top-11 z-20 rounded-xl border border-[var(--paper)]/15 bg-white p-3 shadow-xl ${filterKey === 'years_experience' || filterKey === 'skills' ? 'w-72' : 'w-64'}`}
          onSubmit={(e) => {
            e.preventDefault()
            if (filterKey === 'skills') {
              const next = withSkill(skills, draft)
              onApply(next.length ? next : undefined)
              return
            }
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
              {options.map((o) => <option key={o} value={o}>{filterKey === 'state' ? STATE_LABEL[o] : o}</option>)}
            </select>
          ) : filterKey === 'skills' ? (
            <div>
              {skills.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <li key={skill} className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-[var(--powder)] pr-1 pl-2.5 text-sm text-[var(--paper)]">
                      <span className="truncate">{skill}</span>
                      <button type="button" aria-label={`Remove ${skill}`} className="rounded-full p-0.5 hover:bg-[var(--paper)]/10" onClick={() => setSkills((list) => list.filter((s) => s !== skill))}>
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                className={field}
                value={draft}
                aria-label={label}
                placeholder="Add a skill"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  setSkills((list) => withSkill(list, draft))
                  setDraft('')
                }}
              />
            </div>
          ) : (
            <input className={field} value={draft} aria-label={label} placeholder={label} onChange={(e) => setDraft(e.target.value)} />
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
      if (res.status === 401 || res.status === 403) {
        await logout()
        router.refresh()
        return
      }
      if (res.status === 402) {
        router.push('/402')
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
      <form className={`mt-10 w-full min-w-0 ${fullWidth ? '' : 'max-w-3xl'}`} onSubmit={(e) => void onSubmit(e)}>
        <div className={`flex flex-col rounded-2xl bg-black px-5 pt-5 pb-4 ${fullWidth ? 'min-h-[22rem]' : ''}`}>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Senior React engineers in New York who know Swift and have at least 5 years of experience"
            aria-label="Search briefs"
            rows={fullWidth ? 12 : 3}
            className={`w-full resize-none bg-transparent text-white outline-none placeholder:text-white/45 ${fullWidth ? 'min-h-[18rem] text-2xl leading-snug' : 'text-lg'}`}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }}
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="submit"
              size="sm"
              className="h-10 shrink-0 rounded-full bg-white font-semibold text-black opacity-100"
              disabled={!brief.trim() || busy}
              leftIcon={<ThinkingOrb state="searching" size={20} theme="light" />}
            >
              Search
            </Button>
          </div>
        </div>
      </form>
      {error && <p className="mt-4 text-base text-[var(--bamboo)]">{error}</p>}
    </>
  )
}

export function SearchResults({ searchId }: { searchId: string }) {
  const router = useRouter()
  const [search, setSearch] = useState<SearchPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<{ filters: SearchFilters; unsupported: string[] } | null>(null)
  const [openFilter, setOpenFilter] = useState<keyof SearchFilters | null>(null)

  async function read(res: Response) {
    if (res.status === 402) {
      router.push('/402')
      throw new Error('quota')
    }
    if (res.status === 401) throw new Error('Not authenticated.')
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (body?.error === 'Invalid id' || res.status === 404) throw new Error('Invalid id.')
      throw new Error('Search failed.')
    }
    return (await res.json()) as SearchPayload
  }

  async function fetchPage(id: string, page: number, preview: { filters: SearchFilters; unsupported: string[] } | null) {
    if (preview) {
      const body = preview.unsupported.length ? { ...preview.filters, unsupported: preview.unsupported } : preview.filters
      return read(await fetch('/api/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filters: body, preview: true, page, search_id: id }),
      }))
    }
    return read(await fetch(`/api/search/${id}?page=${page}`, { credentials: 'include', cache: 'no-store' }))
  }

  const ticket = useRef(0)

  async function showPage(
    id: string,
    page: number,
    preview: { filters: SearchFilters; unsupported: string[] } | null,
    nextLive?: { filters: SearchFilters; unsupported: string[] } | null,
  ) {
    const mine = ++ticket.current
    setBusy(true)
    setError(null)
    try {
      const data = await fetchPage(id, page, preview)
      if (mine !== ticket.current) return
      if (nextLive !== undefined) setLive(nextLive)
      setSearch((prev) => ({ ...data, search_id: searchId, brief: data.brief ?? prev?.brief }))
      if (page !== 1) document.getElementById('results')?.scrollIntoView({ block: 'start' })
    } catch (err) {
      if (mine !== ticket.current) return
      if (err instanceof Error && err.message !== 'quota') setError(err.message)
    } finally {
      if (mine === ticket.current) setBusy(false)
    }
  }

  function loadPage(id: string, page: number) {
    void showPage(id, page, live)
  }

  function research(filters: SearchFilters, unsupported: string[]) {
    void showPage(searchId, 1, { filters, unsupported }, { filters, unsupported })
  }

  useEffect(() => {
    void showPage(searchId, 1, null, null)
    return () => { ticket.current += 1 }
    // load when the route id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId])

  const filters = search?.filters ?? {}
  const unsupported = search?.unsupported ?? []
  const setCount = FILTERS.filter((f) => activeCount(filters[f.key]) > 0).length
  const pages = search ? Math.ceil(search.total / PAGE_SIZE) : 0

  return (
    <>
      {unsupported.length > 0 && (
        <p className="mt-6 rounded-xl border border-[#1f7a4d] bg-[#e5f5ea] px-4 py-3 text-base text-[#14532d]" role="status">
          Couldn't use {unsupported.join('; ')}. Showing candidates for the rest of the brief.
        </p>
      )}
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

      {search?.brief && (
        <p className="mt-4 text-sm text-[var(--paper)]/70">
          Saved to <Link href="/saved-briefs" className="underline underline-offset-4">Briefs</Link>.
        </p>
      )}

      {error && <p className="mt-6 text-base text-[var(--bamboo)]">{error}</p>}

      {busy && !search && <p className="mt-16 text-[var(--paper)]/70">Loading candidates…</p>}

      {search && search.total === 0 && (
        <p className="mt-16 text-[var(--paper)]/70">
          No candidates found. Consider removing some filters.
        </p>
      )}

      {search && search.total > 0 && (
        <div id="results" className="mt-10 scroll-mt-24">
          <p className="text-sm text-[var(--paper)]/60">{busy ? 'Loading page…' : `${search.total} candidates`}</p>
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
    </>
  )
}
