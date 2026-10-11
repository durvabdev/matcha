import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/people/[id]'>) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const { id } = await ctx.params
  const { data, error } = await c.db
    .from('candidates')
    .select('*, candidate_experiences(*), candidate_education(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Failed to load candidate' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}
