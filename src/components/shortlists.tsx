'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/easyui/button'

// Calls the shortlist API (session cookie is sent automatically) and refreshes the page data.
function useApi() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolves true on success. On failure sets `error` (the API's message when it sent one).
  async function call(method: string, url: string, body?: object) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body && JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error)
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { call, busy, error }
}

const pill =
  'flex h-12 items-center gap-3 rounded-full border border-white/15 bg-black px-4 transition-[width,border-color] duration-300 focus-within:border-white/40'
const pillInput = 'min-w-0 flex-1 bg-transparent text-lg text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]'

function NewShortlist() {
  const { call, busy, error } = useApi()
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  // Collapsed: a button. Click it and it turns into a name field in the same spot.
  if (!open) {
    return (
      <Button variant="secondary" className="shrink-0 rounded-full bg-black hover:bg-black/60" leftIcon={<Plus className="size-5" />} onClick={() => setOpen(true)}>
        Create shortlist
      </Button>
    )
  }
  return (
    <form
      className="flex shrink-0 items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        if (await call('POST', '/api/shortlists', { name })) {
          setName('')
          setOpen(false)
        }
      }}
    >
      <div className={`${pill} w-72 pr-1.5`}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Shortlist name"
          aria-label="New shortlist name"
          className={pillInput}
        />
        <Button type="submit" size="sm" variant="secondary" className="rounded-full bg-[#1f1f1f]" isLoading={busy} disabled={!name.trim()}>Create</Button>
      </div>
      <button type="button" aria-label="Cancel" onClick={() => setOpen(false)} className="focus-ring rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <X className="size-5" />
      </button>
      {error && <span className="text-rose-400">{error}</span>}
    </form>
  )
}

// iOS-style pill: narrow at rest, widens on focus, clear button once there is text.
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={`${pill} min-w-0 flex-1 sm:w-64 sm:flex-none sm:focus-within:w-96`}>
      <Search className="size-5 shrink-0 text-[var(--text-secondary)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search shortlists or people"
        aria-label="Search shortlists or people"
        className={pillInput}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="focus-ring rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <X className="size-5" />
        </button>
      )}
    </div>
  )
}

export type Person = { id: string; full_name: string; current_title: string | null; current_company: string | null }
export type ShortlistRow = { id: string; name: string; mine: boolean; people: Person[] }

export function ShortlistsView({ shortlists }: { shortlists: ShortlistRow[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const has = (s: string | null) => !!s && s.toLowerCase().includes(q)

  // A shortlist matches by name (show everyone) or by any of its people (show just those).
  const rows = shortlists.flatMap((s) => {
    if (!q || has(s.name)) return [s]
    const people = s.people.filter((p) => has(p.full_name) || has(p.current_title) || has(p.current_company))
    return people.length ? [{ ...s, people }] : []
  })

  return (
    <>
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <filter id="goo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
          </filter>
        </defs>
      </svg>
      <div className="mt-10 flex items-center gap-4">
        <SearchBar value={query} onChange={setQuery} />
        <NewShortlist />
      </div>

      {rows.length === 0 ? (
        <p className="mt-16 text-center text-xl text-[var(--foam)]/60">
          {q ? `Nothing matches “${query.trim()}”.` : 'No shortlists yet. Create your first one above.'}
        </p>
      ) : (
        <ul className="mt-12 flex flex-col gap-10">
          {rows.map((s) => (
            <ShortlistCard key={s.id} s={s} forceOpen={!!q} />
          ))}
        </ul>
      )}
    </>
  )
}

function ShortlistCard({ s, forceOpen }: { s: ShortlistRow; forceOpen: boolean }) {
  const [open, setOpen] = useState(true)
  const show = open || forceOpen

  return (
    <li className="rounded-2xl border border-white/10 bg-black">
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Nothing to collapse when the list is empty, so no chevron. */}
        <button type="button" aria-expanded={show} disabled={s.people.length === 0} onClick={() => setOpen(!show)} className="focus-ring flex min-w-0 flex-1 items-center gap-4 rounded-md text-left">
          <ChevronRight className={`size-5 shrink-0 text-[var(--text-secondary)] transition-transform ${show ? 'rotate-90' : ''} ${s.people.length === 0 ? 'invisible' : ''}`} />
          <span className="min-w-0 flex-1 truncate text-2xl font-medium">{s.name}</span>
        </button>
        {s.mine ? <EditMenu s={s} /> : <span className="text-lg text-[var(--foam)]/60">Teammate</span>}
        <span className="rounded-full bg-[var(--powder)] px-3 py-1 text-base text-[var(--paper)]">
          {s.people.length} {s.people.length === 1 ? 'person' : 'people'}
        </span>
      </div>
      {show && s.people.length > 0 && (
          <ul className="divide-y divide-white/5 rounded-b-2xl border-t border-white/10 bg-[#0d0d0d]">
            {s.people.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-3 pr-6 pl-15">
                <Link href={`/people/${p.id}`} className="min-w-0 flex-1 truncate text-xl hover:underline">
                  {p.full_name}
                  <span className="ml-3 text-lg text-[var(--foam)]/60">
                    {[p.current_title, p.current_company].filter(Boolean).join(' at ')}
                  </span>
                </Link>
                {s.mine && <RemoveCandidate shortlistId={s.id} candidateId={p.id} />}
              </li>
            ))}
          </ul>
      )}
    </li>
  )
}

// "Edit" pill whose options pop out of it like fused liquid (SVG goo filter on the shapes
// layer only, so the text stays sharp). Add / rename open a small field in place.
const GOO = 'url(#goo)'
const ROW = 52 // option height 44 + gap 8
const shape = 'absolute right-0 top-0 h-11 w-56 rounded-full bg-[#2a2a2a]'

function EditMenu({ s }: { s: ShortlistRow }) {
  const { call, busy, error } = useApi()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'rename' | null>(null)
  const [text, setText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    setMode(null)
  }
  useEffect(() => {
    if (!open && !mode) return
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open, mode])

  const start = (m: 'add' | 'rename') => {
    setText(m === 'rename' ? s.name : '')
    setMode(m)
    setOpen(false)
  }
  const options = [
    { label: 'Add person by ID', run: () => start('add') },
    { label: 'Update list name', run: () => start('rename') },
    {
      label: 'Delete list',
      danger: true,
      run: async () => {
        close()
        if (confirm(`Delete “${s.name}”? This can't be undone.`)) await call('DELETE', `/api/shortlists/${s.id}`)
      },
    },
  ]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    // IDs look like cand_0001; a bare number like "12" is accepted as cand_0012.
    const candidateId = /^\d+$/.test(v) ? `cand_${v.padStart(4, '0')}` : v
    const ok =
      mode === 'add'
        ? await call('POST', `/api/shortlists/${s.id}/people/${encodeURIComponent(candidateId)}`)
        : await call('PATCH', `/api/shortlists/${s.id}`, { name: v })
    if (ok) close()
  }

  return (
    // z-30 while open so the menu paints over the cards below (their Edit buttons are z-10).
    <div ref={ref} className={`relative h-11 w-24 shrink-0 ${open || mode ? 'z-30' : ''}`}>
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-[220px] w-56" style={{ filter: GOO }}>
        <div className={`${shape} w-24!`} />
        <AnimatePresence>
          {open &&
            options.map((o, i) => (
              <motion.div
                key={o.label}
                className={shape}
                initial={{ y: 0, scale: 0.5, opacity: 0 }}
                animate={{ y: (i + 1) * ROW, scale: 1, opacity: 1 }}
                exit={{ y: 0, scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.04 }}
              />
            ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (setMode(null), setOpen(!open))}
        className="focus-ring relative z-10 flex h-11 w-24 items-center justify-center gap-1.5 rounded-full text-lg font-medium text-[var(--text-primary)]"
      >
        Edit <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open &&
          options.map((o, i) => (
            <motion.button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={o.run}
              className={`focus-ring absolute top-0 right-0 z-10 h-11 w-56 rounded-full px-5 text-left text-lg hover:bg-white/10 ${o.danger ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: (i + 1) * ROW, opacity: 1 }}
              exit={{ y: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.04 }}
            >
              {o.label}
            </motion.button>
          ))}
      </AnimatePresence>

      {mode && (
        <form onSubmit={submit} className="absolute top-14 right-0 z-20 w-80">
          <div className="flex h-11 items-center gap-2 rounded-full bg-[#2a2a2a] pr-1 pl-5">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === 'add' ? 'Candidate ID, e.g. cand_0001' : 'New list name'}
              aria-label={mode === 'add' ? 'Candidate ID' : 'New list name'}
              className={pillInput}
            />
            <Button type="submit" size="sm" className="h-9 rounded-full" isLoading={busy} disabled={!text.trim()}>
              {mode === 'add' ? 'Add' : 'Save'}
            </Button>
          </div>
          {error && <p className="mt-2 pr-3 text-right text-base text-rose-400">{error}</p>}
        </form>
      )}
      {!open && !mode && error && <p className="absolute top-12 right-0 z-20 w-64 text-right text-base text-rose-400">{error}</p>}
    </div>
  )
}

function RemoveCandidate({ shortlistId, candidateId }: { shortlistId: string; candidateId: string }) {
  const { call, busy } = useApi()
  return (
    <Button
      variant="destructive"
      size="sm"
      isLoading={busy}
      onClick={() => call('DELETE', `/api/shortlists/${shortlistId}/people/${candidateId}`)}
    >
      Remove
    </Button>
  )
}

// One add/remove toggle per shortlist the recruiter owns.
export function ShortlistToggle({
  candidateId,
  shortlists,
}: {
  candidateId: string
  shortlists: { id: string; name: string; has: boolean }[]
}) {
  const { call, busy, error } = useApi()

  if (!shortlists.length) return <p className="text-lg text-[var(--foam)]/60">No shortlists yet. Create one from Shortlists.</p>
  return (
    <ul className="space-y-2">
      {shortlists.map((s) => (
        <li key={s.id} className="flex items-center gap-4">
          <span className="min-w-0 flex-1 truncate">{s.name}</span>
          <Button
            size="sm"
            variant={s.has ? 'destructive' : 'secondary'}
            disabled={busy}
            onClick={() => call(s.has ? 'DELETE' : 'POST', `/api/shortlists/${s.id}/people/${candidateId}`)}
          >
            {s.has ? 'Remove' : 'Add'}
          </Button>
        </li>
      ))}
      {error && <li className="text-rose-400">{error}</li>}
    </ul>
  )
}
