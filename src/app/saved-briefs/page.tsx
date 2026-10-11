import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { recruiterFromToken } from '@/lib/auth'
import { listSavedBriefs } from '@/lib/saved-briefs/service'
import { NavBar } from '@/components/navbar'
import { RunSearch } from '@/components/run-search'
import { formatFilterChip } from '@/lib/search/format'

type Brief = { id: string; brief: string; filters: Record<string, unknown>; created_at: string; search_id: string | null }

export default async function SavedBriefsPage() {
  const r = await recruiterFromToken((await cookies()).get('matcha_session')?.value)
  if (r.error === 'login') redirect('/')
  if (r.error) notFound()

  // RLS limits this to the recruiter's company.
  const { data } = await listSavedBriefs(r.db)
  const briefs = (data ?? []) as Brief[]

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Saved Briefs</h1>

        {briefs.length === 0 ? (
          <p className="mt-16 text-center text-xl text-[var(--foam)]/60">No saved briefs yet.</p>
        ) : (
          <ul className="mt-12 flex flex-col gap-10">
            {briefs.map((b) => {
              const filters = Object.entries(b.filters)
              return (
                <li key={b.id} className="rounded-2xl border border-[var(--paper)]/10 bg-white px-6 py-5">
                  <div className="flex items-baseline gap-4">
                    <p className="min-w-0 flex-1 text-2xl font-medium">{b.brief}</p>
                    <div className="flex shrink-0 items-center gap-3">
                      <time dateTime={b.created_at} className="text-lg text-[var(--foam)]/60">
                        {new Date(b.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </time>
                      {b.search_id && (
                        <Link href={`/search/${b.search_id}`} className="text-lg text-[var(--foam)] hover:underline">
                          Candidates
                        </Link>
                      )}
                      <RunSearch brief={b.brief} filters={b.filters} />
                    </div>
                  </div>
                  {filters.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {filters.map((f) => (
                        <li key={f[0]} className="rounded-full bg-[var(--powder)] px-3 py-1 text-base text-[var(--paper)]">
                          {formatFilterChip(f[0], f[1])}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
