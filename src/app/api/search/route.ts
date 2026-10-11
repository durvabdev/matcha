import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'
import { parseSearchFilters, searchRequestBody, toStoredFilters } from '@/lib/search/schema'
import { extractFilters } from '@/lib/search/extractor'
import { createSearch, previewSearch } from '@/lib/search/service'
import { createSavedBrief } from '@/lib/saved-briefs/service'

const MAX_BODY_CHARS = 16 * 1024

export async function POST(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const raw = await req.text()
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

  let json: unknown
  try { json = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 }) }

  const body = searchRequestBody.safeParse(json)
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  let parsed
  if (body.data.filters !== undefined) {
    parsed = parseSearchFilters(body.data.filters)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } else {
    try {
      parsed = { success: true as const, data: await extractFilters(body.data.brief!) }
    } catch (err) {
      const status = err instanceof Error && 'status' in err ? Number((err as { status: number }).status) : 502
      if (status === 422) return NextResponse.json({ error: 'Invalid extracted filters' }, { status: 422 })
      return NextResponse.json({ error: 'Search extractor unavailable' }, { status: 502 })
    }
  }

  if (body.data.preview) {
    const page = body.data.page ?? 1
    const result = await previewSearch(c.db, toStoredFilters(parsed.data), page)
    if (result.error) return NextResponse.json({ error: 'Failed to load search' }, { status: 500 })
    return NextResponse.json(result)
  }

  const result = await createSearch(c.db, { brief: body.data.brief, filters: toStoredFilters(parsed.data) })
  if (result.error === 'quota') return NextResponse.json({ error: 'Search quota exceeded' }, { status: 402 })
  if (result.error) return NextResponse.json({ error: 'Failed to create search' }, { status: 500 })
  if (body.data.brief) {
    await createSavedBrief(c.db, c.companyId, {
      brief: body.data.brief,
      filters: toStoredFilters(parsed.data),
      search_id: result.search_id,
    })
  }
  return NextResponse.json(result)
}
