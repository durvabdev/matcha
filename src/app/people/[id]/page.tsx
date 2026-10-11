import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/easyui/button'
import { NavBar } from '@/components/navbar'
import { ShortlistToggle } from '@/components/shortlists'

type Experience = {
  id: number
  title: string | null
  company: string | null
  company_logo_url: string | null
  company_type: string | null
  start_year: number | null
  end_year: number | null
  description: string | null
}

type Education = {
  id: number
  school: string | null
  degree: string | null
  field: string | null
  graduation_year: number | null
}

type Candidate = {
  id: string
  full_name: string
  avatar_url: string | null
  headline: string | null
  current_title: string | null
  current_company: string | null
  current_company_logo_url: string | null
  role: string | null
  seniority: string | null
  years_experience: number | null
  city: string | null
  state: string | null
  country: string | null
  open_to_work: boolean
  skills: string[]
  candidate_experiences: Experience[]
  candidate_education: Education[]
}

function joined(parts: (string | null)[], separator: string) {
  return parts.filter(Boolean).join(separator) || null
}

function years(start: number | null, end: number | null) {
  if (!start && !end) return null
  return `${start ?? ''}–${end ?? 'Present'}`
}

function newestFirst(a: Experience, b: Experience) {
  return (b.end_year ?? Infinity) - (a.end_year ?? Infinity) || b.id - a.id
}

function Logo({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      className="inline-block size-6 shrink-0 object-contain"
    />
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-8 sm:grid-cols-[10rem_1fr] sm:gap-8">
      <div className="text-lg text-[var(--foam)]/60">{label}</div>
      <div className="min-w-0 text-xl leading-relaxed">{children}</div>
    </div>
  )
}

export default async function CandidatePage(props: PageProps<'/people/[id]'>) {
  const token = (await cookies()).get('matcha_session')?.value
  if (!token) redirect('/')

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: auth } = await db.auth.getClaims(token)
  const userId = auth?.claims.sub
  if (!userId) redirect('/')

  const { data: recruiter } = await db.from('recruiters').select('id').eq('id', userId).maybeSingle()
  if (!recruiter) notFound()

  const { id } = await props.params
  const { data, error } = await db
    .from('candidates')
    .select('*, candidate_experiences(*), candidate_education(*)')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) notFound()

  const { data: lists } = await db
    .from('shortlists')
    .select('id, name, shortlist_people(candidate_id)')
    .eq('recruiter_id', userId)
    .order('created_at')
  const shortlists = (lists ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    has: s.shortlist_people.some((p) => p.candidate_id === id),
  }))

  const c = data as Candidate
  const location = joined([c.city, c.state, c.country], ', ')
  const currentRole = joined(
    [c.current_title, c.current_company ? `at ${c.current_company}` : null],
    ' ',
  )

  return (
    <div className="candidate-page h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="flex items-center gap-6">
          {c.avatar_url ? (
            <img src={c.avatar_url} alt="" width={96} height={96} className="size-24 shrink-0 rounded-full bg-[var(--kiln)] object-cover ring-1 ring-[var(--foam)]/30" />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-[var(--powder)] text-4xl font-semibold text-[var(--paper)]">
              {c.full_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">{c.full_name}</h1>
            <p className="mt-2 text-xl text-[var(--foam)]/70">{joined([location, c.seniority], ' · ')}</p>
            <p className="mt-1 text-lg text-[var(--foam)]/50">ID: {c.id}</p>
            {c.years_experience != null && (
              <p className="mt-1 text-lg text-[var(--foam)]/50">{c.years_experience} years of experience</p>
            )}
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-[var(--powder)] px-4 py-2 text-base text-[var(--paper)]">
            {c.open_to_work ? 'Open to work' : 'Not open to work'}
          </span>
        </header>

        <Row label="Shortlists">
          <ShortlistToggle candidateId={c.id} shortlists={shortlists} />
        </Row>

        {(c.headline || c.role || currentRole) && (
          <Row label="About">
            {c.headline && <p>{c.headline}</p>}
            {c.role && <p className={c.headline ? 'mt-2' : undefined}>{c.role}</p>}
            {currentRole && (
              <p className={`flex items-center gap-3 text-lg text-[var(--foam)]/70 ${c.headline || c.role ? 'mt-2' : ''}`}>
                {c.current_company_logo_url && <Logo src={c.current_company_logo_url} />}
                {currentRole}
              </p>
            )}
          </Row>
        )}

        {c.skills.length > 0 && (
          <Row label="Skills">
            <ul className="flex flex-wrap gap-2">
              {c.skills.map((s) => (
                <li key={s}>
                  <Button variant="primary" size="sm">{s}</Button>
                </li>
              ))}
            </ul>
          </Row>
        )}

        {c.candidate_experiences.length > 0 && (
          <Row label="Work">
            {c.candidate_experiences.sort(newestFirst).map((e) => (
              <div key={e.id} className="mb-8 last:mb-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-8">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-right text-[var(--foam)]/70">{years(e.start_year, e.end_year)}</p>
                  <p className="flex min-w-0 items-center gap-3">
                    {e.company_logo_url && <Logo src={e.company_logo_url} />}
                    {e.company}
                  </p>
                  <p className="text-right text-[var(--foam)]/60">{e.company_type}</p>
                </div>
                {e.description && <p className="mt-2 text-lg whitespace-pre-line text-[var(--paper)]/90">{e.description}</p>}
              </div>
            ))}
          </Row>
        )}

        {c.candidate_education.length > 0 && (
          <Row label="Education">
            {c.candidate_education.map((e) => (
              <p key={e.id}>
                {joined([e.degree, e.field], ' in ')}
                {e.school && ` at ${e.school}`}
                {e.graduation_year && ` · ${e.graduation_year}`}
              </p>
            ))}
          </Row>
        )}

      </div>
    </div>
  )
}
