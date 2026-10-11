import { NextResponse, type NextRequest } from 'next/server'
import { requireRecruiter } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const c = await requireRecruiter(req)
  if (c.error) return c.error

  const { data, error } = await c.db
    .from('company_plans')
    .select('plan, searches_used')
    .eq('company_id', c.companyId)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 })

  if (data.plan === 'paid') {
    return NextResponse.json({ plan: 'paid', searches_remaining: null })
  }
  return NextResponse.json({
    plan: 'free',
    searches_remaining: Math.max(0, 1 - data.searches_used),
  })
}
