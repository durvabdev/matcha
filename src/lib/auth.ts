import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// A db client scoped to the token's recruiter (RLS applies), or why that failed.
export async function recruiterFromToken(token: string | undefined) {
  if (!token) return { error: 'login' as const }

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: auth } = await db.auth.getClaims(token)
  const userId = auth?.claims.sub
  if (!userId) return { error: 'login' as const }

  const { data: recruiter } = await db.from('recruiters').select('id, company_id').eq('id', userId).maybeSingle()
  if (!recruiter) return { error: 'forbidden' as const }

  return { db, userId, companyId: recruiter.company_id as string }
}

// recruiterDb + the shortlist must exist (404) and belong to the caller (403).
export async function ownedShortlist(req: NextRequest, shortlistId: string) {
  const c = await recruiterDb(req)
  if (c.error) return { error: c.error }

  const { data } = await c.db.from('shortlists').select('recruiter_id').eq('id', shortlistId).maybeSingle()
  if (!data) return { error: NextResponse.json({ error: 'Shortlist not found' }, { status: 404 }) }
  if (data.recruiter_id !== c.userId) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { db: c.db }
}

// Bearer token for API clients, session cookie for the browser.
export async function recruiterDb(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  const r = await recruiterFromToken(bearer ?? req.cookies.get('matcha_session')?.value)
  if (r.error === 'login') return { error: NextResponse.redirect(new URL('/', req.url)) }
  if (r.error) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return r
}

// JSON-API variant: Bearer token only, 401 (not a redirect) when it is missing or invalid.
export async function requireRecruiter(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  const r = await recruiterFromToken(token)
  if (r.error === 'login') return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (r.error) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return r
}
