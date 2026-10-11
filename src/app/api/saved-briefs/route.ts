import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'
import { createSavedBriefBody } from '@/lib/saved-briefs/schema'
import { createSavedBrief, listSavedBriefs } from '@/lib/saved-briefs/service'

const MAX_BODY_CHARS = 16 * 1024

export async function POST(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const raw = await req.text()
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const parsed = createSavedBriefBody.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return NextResponse.json({ error: 'Invalid request', issues }, { status: 400 })
  }

  const { data, error } = await createSavedBrief(c.db, c.companyId, parsed.data)
  if (error) return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const { data, error } = await listSavedBriefs(c.db)
  if (error) return NextResponse.json({ error: 'Failed to load saved briefs' }, { status: 500 })

  return NextResponse.json({ saved_briefs: data })
}
