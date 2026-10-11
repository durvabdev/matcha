import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  // RLS limits this to the caller's company.
  const { data, error } = await c.db
    .from('shortlists')
    .select('id, name, recruiter_id, created_at, shortlist_people(candidate_id)')
    .order('created_at')
  if (error) return NextResponse.json({ error: 'Failed to load shortlists' }, { status: 500 })

  return NextResponse.json(
    data.map(({ shortlist_people, ...s }) => ({ ...s, candidate_ids: shortlist_people.map((p) => p.candidate_id) })),
  )
}

export async function POST(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: '"name" is required' }, { status: 400 })

  const { data, error } = await c.db
    .from('shortlists')
    .insert({ name, company_id: c.companyId, recruiter_id: c.userId })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: 'Failed to create shortlist' }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
