import { NextResponse, type NextRequest } from 'next/server'
import { ownedShortlist } from '@/lib/auth'

type Ctx = RouteContext<'/api/shortlists/[shortlist_id]'>

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { shortlist_id } = await ctx.params
  const o = await ownedShortlist(req, shortlist_id)
  if (o.error) return o.error

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: '"name" is required' }, { status: 400 })

  const { error } = await o.db.from('shortlists').update({ name }).eq('id', shortlist_id)
  if (error) return NextResponse.json({ error: 'Failed to rename shortlist' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

// Candidates on the list are removed with it (ON DELETE CASCADE).
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { shortlist_id } = await ctx.params
  const o = await ownedShortlist(req, shortlist_id)
  if (o.error) return o.error

  const { error } = await o.db.from('shortlists').delete().eq('id', shortlist_id)
  if (error) return NextResponse.json({ error: 'Failed to delete shortlist' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
