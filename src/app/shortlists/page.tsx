import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { recruiterFromToken } from '@/lib/auth'
import { NavBar } from '@/components/navbar'
import { ShortlistsView, type Person } from '@/components/shortlists'

export default async function ShortlistsPage() {
  const r = await recruiterFromToken((await cookies()).get('matcha_session')?.value)
  if (r.error === 'login') redirect('/')
  if (r.error) notFound()

  // RLS limits this to the recruiter's company.
  const { data } = await r.db
    .from('shortlists')
    .select('id, name, recruiter_id, shortlist_people(candidates(id, full_name, current_title, current_company))')
    .order('created_at')

  // Untyped client infers the to-one embed as an array; at runtime it is an object.
  const rows = (data ?? []) as unknown as {
    id: string
    name: string
    recruiter_id: string
    shortlist_people: { candidates: Person | null }[]
  }[]

  const shortlists = rows.map((s) => ({
    id: s.id,
    name: s.name,
    mine: s.recruiter_id === r.userId,
    people: s.shortlist_people.flatMap((p) => (p.candidates ? [p.candidates] : [])),
  }))

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-64 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Shortlists</h1>
        <ShortlistsView shortlists={shortlists} />
      </main>
    </div>
  )
}
