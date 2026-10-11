import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { NavBar } from '@/components/navbar'
import { SearchResults } from '@/components/search-panel'
import { recruiterFromToken } from '@/lib/auth'

export default async function SearchPage({ params }: { params: Promise<{ search_id: string }> }) {
  const { search_id } = await params
  const r = await recruiterFromToken((await cookies()).get('matcha_session')?.value)
  if (r.error === 'login') redirect('/')
  if (r.error) notFound()

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Candidates</h1>
        <SearchResults searchId={search_id} />
      </main>
    </div>
  )
}
