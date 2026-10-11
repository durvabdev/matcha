import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { recruiterFromToken } from '@/lib/auth'
import { listSavedBriefs } from '@/lib/saved-briefs/service'
import { NavBar } from '@/components/navbar'
import { BriefCard, type SavedBrief } from '@/components/brief-card'

export default async function SavedBriefsPage() {
  const r = await recruiterFromToken((await cookies()).get('matcha_session')?.value)
  if (r.error === 'login') redirect('/')
  if (r.error) notFound()

  // RLS limits this to the recruiter's company.
  const { data } = await listSavedBriefs(r.db)
  const briefs = (data ?? []) as SavedBrief[]

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Saved Briefs</h1>

        {briefs.length === 0 ? (
          <p className="mt-16 text-center text-xl text-[var(--foam)]/60">No saved briefs yet.</p>
        ) : (
          <ul className="mt-12 flex flex-col gap-10">
            {briefs.map((b) => (
              <BriefCard key={b.id} brief={b} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
