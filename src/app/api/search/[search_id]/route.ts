import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'
import { getSearchPage } from '@/lib/search/service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest, ctx: RouteContext<'/api/search/[search_id]'>) {
  const c = await requireRecruiter(req)
  if (c.error?.status === 401) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (c.error) return c.error

  const { search_id } = await ctx.params
  if (!UUID.test(search_id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const raw = req.nextUrl.searchParams.get('page') ?? '1'
  const page = Number(raw)
  if (!Number.isInteger(page) || page < 1) return NextResponse.json({ error: 'Invalid page' }, { status: 400 })

  const result = await getSearchPage(c.db, search_id, page)
  if (result.error === 'not_found') return NextResponse.json({ error: 'Invalid id' }, { status: 404 })
  if (result.error) return NextResponse.json({ error: 'Failed to load search' }, { status: 500 })
  return NextResponse.json(result)
}
