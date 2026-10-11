import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { extractFilters, parseModelFilters } from '../src/lib/search/extractor.ts'
import { parseSearchFilters } from '../src/lib/search/schema.ts'

const prevKey = process.env.OPENAI_API_KEY
afterEach(() => {
  if (prevKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = prevKey
})

const COLUMNS = ['skills','role','seniority','city','state','country','years_experience','open_to_work','current_title','current_company','company','company_type','title','school','degree','field']

test('legacy camelCase maps onto columns', () => {
  const parsed = parseSearchFilters({
    minYearsExperience: 5, maxYearsExperience: 10, openToWork: true, companyType: 'Startup',
    educationDegree: 'Ph.D.', educationSchool: 'Stanford', previousCompanies: 'Acme', jobTitle: 'Engineer', unsupported: true,
  })
  assert.equal(parsed.success, true)
  if (!parsed.success) return
  assert.deepEqual(parsed.data.filters.years_experience, [{ operator: 'gte', value: 5 }, { operator: 'lte', value: 10 }])
  assert.equal(parsed.data.filters.open_to_work, true)
  assert.equal(parsed.data.filters.company_type, 'startup')
  assert.equal(parsed.data.filters.degree, 'PhD')
  assert.equal(parsed.data.filters.school, 'Stanford')
  assert.equal(parsed.data.filters.company, 'Acme')
  assert.equal(parsed.data.filters.title, 'Engineer')
  assert.deepEqual(parsed.data.unsupported, ['unsupported requirement'])
})

test('at least five stays gte', () => {
  const parsed = parseSearchFilters({ years_experience: { operator: 'gte', value: 5 } })
  assert.equal(parsed.success, true)
  if (!parsed.success) return
  assert.deepEqual(parsed.data.filters.years_experience, { operator: 'gte', value: 5 })
})

test('parseModelFilters rejects unknown keys', () => {
  assert.throws(() => parseModelFilters({ filters: { language: 'Japanese' }, unsupported: [] }), (err: { status?: number }) => err.status === 422)
})

test('SQL in a filter value stays data', () => {
  const parsed = parseModelFilters({ filters: { role: 'Engineer; DROP TABLE candidates' }, unsupported: [] })
  assert.equal(parsed.filters.role, 'Engineer; DROP TABLE candidates')
})

test('missing API key is 502', async () => {
  delete process.env.OPENAI_API_KEY
  await assert.rejects(() => extractFilters('mid Python engineers in Denver'), (err: { status?: number }) => err.status === 502)
})

test('API failure is 502', async () => {
  process.env.OPENAI_API_KEY = 'sk-test'
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response('nope', { status: 500 })
  try { await assert.rejects(() => extractFilters('mid Python engineers in Denver'), (err: { status?: number }) => err.status === 502) }
  finally { globalThis.fetch = orig }
})

test('malformed model JSON is 502', async () => {
  process.env.OPENAI_API_KEY = 'sk-test'
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not-json' } }] }), { status: 200 })
  try { await assert.rejects(() => extractFilters('brief'), (err: { status?: number }) => err.status === 502) }
  finally { globalThis.fetch = orig }
})

test('live extraction uses real columns', async (t) => {
  if (!process.env.OPENAI_API_KEY) { t.skip('OPENAI_API_KEY is not set'); return }
  const parsed = await extractFilters('mid Python engineers in Denver with at least 3 years of experience')
  for (const key of Object.keys(parsed.filters)) assert.ok(COLUMNS.includes(key), key)
  assert.equal(parsed.filters.seniority, 'mid')
  assert.equal(parsed.filters.city, 'Denver')
  assert.ok(parsed.filters.skills?.includes('Python'))
  assert.deepEqual(parsed.filters.years_experience, { operator: 'gte', value: 3 })
  assert.equal(JSON.stringify(parsed).includes('DROP'), false)
  assert.ok(Array.isArray(parsed.unsupported))
})
