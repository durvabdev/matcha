import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { request } from 'undici'

const APP = process.env.APP_URL ?? 'http://localhost:3000'
const PASSWORD = 'rotto-assessment'
const url = process.env.SUPABASE_URL!
const anon = process.env.SUPABASE_PUBLISHABLE_KEY!
const secret = process.env.SUPABASE_SECRET_KEY!

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

const FILTERS = { role: 'Mobile Engineer', skills: ['Swift'] }

async function signIn(email: string) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw error ?? new Error('sign-in failed')
  const scoped = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  const { data: rec } = await scoped.from('recruiters').select('company_id').eq('id', data.user.id).single()
  return { token: data.session.access_token, db: scoped, companyId: rec!.company_id as string }
}

async function setPlan(companyId: string, plan: 'free' | 'paid', used: number) {
  const { error } = await admin.from('company_plans').update({ plan, searches_used: used }).eq('company_id', companyId)
  assert.ifError(error)
}

async function used(companyId: string) {
  const { data } = await admin.from('company_plans').select('searches_used, plan').eq('company_id', companyId).single()
  return data!
}

async function api(path: string, init: RequestInit = {}) {
  return fetch(`${APP}${path}`, init)
}

async function json(path: string, token: string, body?: unknown, method = 'POST') {
  const res = await api(path, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { res, body: await res.json().catch(() => ({})) }
}

const acme = await signIn('recruiter@acme.test')
const globex = await signIn('recruiter@globex.test')

after(async () => {
  await setPlan(acme.companyId, 'free', 0)
  await setPlan(globex.companyId, 'free', 0)
})

test('401 without auth', async () => {
  const post = await api('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  assert.equal(post.status, 401)
  const get = await api('/api/search/00000000-0000-0000-0000-000000000000')
  assert.equal(get.status, 401)
})

test('cookie auth via raw Cookie header', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const { statusCode, body } = await request(`${APP}/api/search`, {
    method: 'POST',
    headers: { cookie: `matcha_session=${acme.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ filters: FILTERS }),
  })
  assert.equal(statusCode, 200)
  const json = (await body.json()) as { search_id: string; results: unknown[]; total: number }
  assert.ok(json.search_id)
  assert.ok(json.total >= json.results.length)
  assert.ok(json.results.length <= 20)
})

test('POST/GET shape, page slices, invalid page', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const { res, body } = await json('/api/search', acme.token, { filters: FILTERS })
  assert.equal(res.status, 200)
  assert.ok(typeof body.search_id === 'string')
  assert.equal(body.page, 1)
  assert.ok(body.total >= body.results.length)
  assert.ok(body.results.length <= 20)
  assert.equal(body.searches_remaining, null)
  assert.deepEqual(body.filters.skills, ['Swift'])

  const page2 = await json(`/api/search/${body.search_id}?page=2`, acme.token, undefined, 'GET')
  assert.equal(page2.res.status, 200)
  assert.equal(page2.body.page, 2)
  assert.equal(page2.body.total, body.total)
  if (body.total > 20) {
    assert.notEqual(page2.body.results[0]?.id, body.results[0]?.id)
    assert.ok(page2.body.results.length <= 20)
  }

  const past = await json(`/api/search/${body.search_id}?page=999`, acme.token, undefined, 'GET')
  assert.equal(past.res.status, 200)
  assert.deepEqual(past.body.results, [])
  assert.equal(past.body.total, body.total)

  const bad = await json(`/api/search/${body.search_id}?page=0`, acme.token, undefined, 'GET')
  assert.equal(bad.res.status, 400)
})

test('Acme/Globex isolation including RLS', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  await setPlan(globex.companyId, 'paid', 0)
  const created = await json('/api/search', acme.token, { filters: FILTERS })
  const id = created.body.search_id as string

  const get = await json(`/api/search/${id}?page=1`, globex.token, undefined, 'GET')
  assert.equal(get.res.status, 404)

  const { data } = await globex.db.from('searches').select('id').eq('id', id)
  assert.deepEqual(data, [])
})

test('GET does not increment searches_used', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const created = await json('/api/search', acme.token, { filters: FILTERS })
  const before = await used(acme.companyId)
  await json(`/api/search/${created.body.search_id}?page=1`, acme.token, undefined, 'GET')
  const after = await used(acme.companyId)
  assert.equal(after.searches_used, before.searches_used)
})

test('free quota 402 and concurrent race', async () => {
  await setPlan(acme.companyId, 'free', 0)
  const first = await json('/api/search', acme.token, { filters: FILTERS })
  assert.equal(first.res.status, 200)
  assert.equal(first.body.searches_remaining, 0)
  const second = await json('/api/search', acme.token, { filters: FILTERS })
  assert.equal(second.res.status, 402)

  await setPlan(acme.companyId, 'free', 0)
  const [a, b] = await Promise.all([
    json('/api/search', acme.token, { filters: FILTERS }),
    json('/api/search', acme.token, { filters: FILTERS }),
  ])
  const statuses = [a.res.status, b.res.status].sort()
  assert.deepEqual(statuses, [200, 402])
  assert.equal((await used(acme.companyId)).searches_used, 1)
})

test('paid is allowed after the free credit is used', async () => {
  await setPlan(acme.companyId, 'paid', 1)
  const { res, body } = await json('/api/search', acme.token, { filters: FILTERS })
  assert.equal(res.status, 200)
  assert.equal(body.searches_remaining, null)
})

test('cancel to free does not restore a used search', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const created = await json('/api/search', acme.token, { filters: FILTERS })
  assert.equal(created.res.status, 200)
  await admin.from('company_plans').update({ plan: 'free' }).eq('company_id', acme.companyId)
  const plan = await api('/api/plan', { headers: { authorization: `Bearer ${acme.token}` } })
  const body = await plan.json()
  assert.equal(body.plan, 'free')
  assert.equal(body.searches_remaining, 0)
})

test('unsupported filters return nobody', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const { res, body } = await json('/api/search', acme.token, { filters: { unsupported: true } })
  assert.equal(res.status, 200)
  assert.equal(body.total, 0)
  assert.deepEqual(body.results, [])
})

test('POST brief with filters saves a brief linked to the search', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const { res, body } = await json('/api/search', acme.token, { brief: 'mobile engineers who know Swift', filters: FILTERS })
  assert.equal(res.status, 200)
  const { data, error } = await acme.db.from('saved_briefs').select('search_id, brief').eq('search_id', body.search_id)
  assert.ifError(error)
  assert.equal(data?.length, 1)
  assert.equal(data![0].brief, 'Mobile engineers who know swift')
  assert.equal(data![0].search_id, body.search_id)
})

test('POST brief without extractor is 502, not a silent mock', async () => {
  await setPlan(acme.companyId, 'paid', 0)
  const { res } = await json('/api/search', acme.token, { brief: 'mobile engineers who know Swift' })
  assert.equal(res.status, 502)
  assert.equal((await used(acme.companyId)).searches_used, 0)
})
