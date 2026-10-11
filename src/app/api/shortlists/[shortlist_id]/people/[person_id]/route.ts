import { NextResponse, type NextRequest } from 'next/server'
import { ownedShortlist } from '@/lib/auth'

type Ctx = RouteContext<'/api/shortlists/[shortlist_id]/people/[person_id]'>

export async function POST(req: NextRequest, ctx: Ctx) {
  const { shortlist_id, person_id } = await ctx.params
  const o = await ownedShortlist(req, shortlist_id)
  if (o.error) return o.error

  // ignoreDuplicates: adding a candidate already on the list changes nothing.
  const { error } = await o.db
    .from('shortlist_people')
    .upsert({ shortlist_id, candidate_id: person_id }, { ignoreDuplicates: true })
  if (error?.code === '23503') return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Failed to add candidate' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { shortlist_id, person_id } = await ctx.params
  const o = await ownedShortlist(req, shortlist_id)
  if (o.error) return o.error

  const { error } = await o.db
    .from('shortlist_people')
    .delete()
    .eq('shortlist_id', shortlist_id)
    .eq('candidate_id', person_id)
  if (error) return NextResponse.json({ error: 'Failed to remove candidate' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
