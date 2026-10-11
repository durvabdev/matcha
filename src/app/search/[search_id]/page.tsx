import { cookies } from 'next/headers'
import { NavBar } from '@/components/navbar'
import { SearchResults } from '@/components/search-panel'
import { recruiterFromToken } from '@/lib/auth'
import { getSearchPage } from '@/lib/search/service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Note({ children }: { children: string }) {
  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24 sm:px-10">
        <p className="text-base text-[var(--bamboo)]">{children}</p>
      </main>
    </div>
  )
}

export default async function SearchPage({ params }: { params: Promise<{ search_id: string }> }) {
  const { search_id } = await params
  const r = await recruiterFromToken((await cookies()).get('matcha_session')?.value)
  if (r.error) return <Note>Not authenticated.</Note>
  if (!UUID.test(search_id)) return <Note>Invalid id.</Note>
  const owned = await getSearchPage(r.db, search_id, 1)
  if ('error' in owned) return <Note>Invalid id.</Note>

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Candidates
          {owned.brief && (
            <span className="mt-3 block text-2xl font-medium tracking-normal text-[var(--paper)]/70">
              for brief: {owned.brief}
            </span>
          )}
        </h1>
        <SearchResults searchId={search_id} />
      </main>
    </div>
  )
}
