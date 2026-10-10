import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/people/[id]'>) {
  // Bearer token for API clients, session cookie for the browser.
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  const token = bearer ?? req.cookies.get('matcha_session')?.value
  const login = NextResponse.redirect(new URL('/', req.url))
  if (!token) return login

  // Publishable key + the user's token: RLS policies decide what is readable.
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: auth } = await db.auth.getClaims(token)
  const userId = auth?.claims.sub
  if (!userId) return login

  const { data: recruiter } = await db.from('recruiters').select('id').eq('id', userId).maybeSingle()
  if (!recruiter) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const { data, error } = await db
    .from('candidates')
    .select('*, candidate_experiences(*), candidate_education(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Failed to load candidate' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}
