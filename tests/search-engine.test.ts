import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const queries = JSON.parse(readFileSync(new URL('../setup/queries.json', import.meta.url), 'utf8')) as {
  brief: string
  expected_ids: string[]
}[]

const FIXTURES: Record<string, Record<string, unknown>> = {
  'senior React engineers in New York who have worked at a startup': { seniority: 'senior', skills: ['React'], role: 'Engineer', city: 'New York', company_type: 'startup' },
  'product designers in San Francisco who are open to work': { role: 'Product Designer', city: 'San Francisco', open_to_work: true },
  'data scientists with a PhD': { role: 'Data Scientist', degree: 'PhD' },
  'backend engineers in Austin who know Go and Kubernetes': { role: 'Backend Engineer', city: 'Austin', skills: ['Go', 'Kubernetes'] },
  'staff full stack engineers in Seattle': { seniority: 'staff', role: 'Full Stack Engineer', city: 'Seattle' },
  'machine learning engineers who studied at Stanford': { role: 'Machine Learning Engineer', school: 'Stanford' },
  'account executives in Chicago with enterprise sales experience': { role: 'Account Executive', city: 'Chicago', skills: ['Enterprise Sales'] },
  'junior frontend engineers in Boston who are open to work': { seniority: 'junior', role: 'Frontend Engineer', city: 'Boston', open_to_work: true },
  'mobile engineers who know Swift': { role: 'Mobile Engineer', skills: ['Swift'] },
  'product managers who speak Japanese': { unsupported: ['language'] },
}

async function match(filters: Record<string, unknown>) {
  const { data, error } = await admin.rpc('match_candidates', { filters })
  assert.ifError(error)
  return (data ?? []) as { id: string; score: number }[]
}

test('fixtures match queries.json as sets', async () => {
  assert.equal(Object.keys(FIXTURES).length, queries.length)
  for (const q of queries) {
    const filters = FIXTURES[q.brief]
    assert.ok(filters, q.brief)
    const ids = (await match(filters)).map((r) => r.id)
    assert.deepEqual(new Set(ids), new Set(q.expected_ids), q.brief)
  }
})

test('unsupported returns no rows', async () => {
  assert.deepEqual(await match({ unsupported: ['visa'] }), [])
  assert.deepEqual(await match({ unsupported: true, role: 'Engineer' }), [])
})

test('empty filters are deterministic', async () => {
  const a = (await match({})).map((r) => r.id)
  const b = (await match({})).map((r) => r.id)
  assert.ok(a.length > 1)
  assert.deepEqual(a, b)
})

test('years_experience gte is not equality', async () => {
  const atLeast = await match({ years_experience: { operator: 'gte', value: 10 } })
  const exactly = await match({ years_experience: { operator: 'eq', value: 10 } })
  assert.ok(atLeast.length > exactly.length)
  const sample = atLeast.slice(0, 40).map((r) => r.id)
  const { data } = await admin.from('candidates').select('id, years_experience').in('id', sample)
  assert.equal(data?.length, sample.length)
  for (const c of data ?? []) assert.ok((c.years_experience as number) >= 10)
})

test('years_experience upper bound', async () => {
  const rows = await match({ years_experience: [{ operator: 'gte', value: 2 }, { operator: 'lte', value: 4 }] })
  assert.ok(rows.length > 0)
  const sample = rows.slice(0, 40).map((r) => r.id)
  const { data } = await admin.from('candidates').select('id, years_experience').in('id', sample)
  assert.equal(data?.length, sample.length)
  for (const c of data ?? []) {
    const years = c.years_experience as number
    assert.ok(years >= 2 && years <= 4)
  }
})

test('previous company is an experience match', async () => {
  const { data: sample } = await admin.from('candidate_experiences').select('candidate_id, company').not('company', 'is', null).limit(1)
  const company = sample?.[0]?.company as string
  const candidateId = sample?.[0]?.candidate_id as string
  const ids = new Set((await match({ company })).map((r) => r.id))
  assert.equal(ids.has(candidateId), true)
})

test('SQL in a filter value stays data', async () => {
  const before = await admin.from('candidates').select('id', { count: 'exact', head: true })
  const rows = await match({ role: 'Engineer; DROP TABLE candidates' })
  const after = await admin.from('candidates').select('id', { count: 'exact', head: true })
  assert.equal(after.count, before.count)
  assert.equal(rows.length, 0)
})

test('React is exact and does not match React Native', async () => {
  const ids = new Set((await match({ skills: ['React'] })).map((r) => r.id))
  const { data } = await admin.from('candidates').select('id, skills').in('id', [...ids].slice(0, 50))
  for (const c of data ?? []) assert.ok((c.skills as string[]).some((s) => s.toLowerCase() === 'react'))
  const { data: nativeOnly } = await admin.from('candidates').select('id, skills').contains('skills', ['React Native']).limit(20)
  for (const c of nativeOnly ?? []) {
    const hasReact = (c.skills as string[]).some((s) => s.toLowerCase() === 'react')
    if (!hasReact) assert.equal(ids.has(c.id), false)
  }
})

test('rank is skill count, open_to_work, years desc, id asc', async () => {
  const ranked = await match({ skills: ['Python'], city: 'Austin' })
  assert.ok(ranked.length > 1)
  const { data } = await admin.from('candidates').select('id, open_to_work, years_experience, skills').in('id', ranked.map((r) => r.id))
  const byId = new Map((data ?? []).map((c) => [c.id, c]))
  const key = (id: string, score: number) => {
    const c = byId.get(id)!
    return [score, c.open_to_work ? 1 : 0, c.years_experience ?? -1, id] as const
  }
  for (let i = 1; i < ranked.length; i++) {
    const a = key(ranked[i - 1].id, ranked[i - 1].score)
    const b = key(ranked[i].id, ranked[i].score)
    const ordered = a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]) || (a[0] === b[0] && a[1] === b[1] && a[2] > b[2]) || (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] <= b[3])
    assert.ok(ordered)
  }
})
