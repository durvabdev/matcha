import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max)

export const yearCompare = z.strictObject({
  operator: z.enum(['eq', 'gt', 'gte', 'lt', 'lte']),
  value: z.number().int().min(0).max(60),
})

export type YearCompare = z.infer<typeof yearCompare>

const years = z.union([yearCompare, z.array(yearCompare).min(1).max(2)])

function yearBoundsOk(value: z.infer<typeof years> | undefined) {
  if (!value) return true
  const list = Array.isArray(value) ? value : [value]
  const lower = list.filter((c) => c.operator === 'gt' || c.operator === 'gte').map((c) => c.value)
  const upper = list.filter((c) => c.operator === 'lt' || c.operator === 'lte').map((c) => c.value)
  if (!lower.length || !upper.length) return true
  return Math.max(...lower) <= Math.min(...upper)
}

const candidateFilters = z.strictObject({
  skills: z.array(text(50)).max(20),
  role: text(100),
  seniority: z.enum(['junior', 'mid', 'senior', 'staff']),
  city: text(100),
  state: text(100),
  country: text(100),
  years_experience: years,
  open_to_work: z.boolean(),
  current_title: text(200),
  current_company: text(200),
}).partial()

const experienceFilters = z.strictObject({
  company: text(200),
  company_type: z.enum(['startup', 'enterprise']),
  title: text(200),
}).partial()

const educationFilters = z.strictObject({
  school: text(200),
  degree: z.enum(['BA', 'BS', 'MBA', 'MS', 'PhD']),
  field: text(200),
}).partial()

export const searchFilters = candidateFilters
  .extend(experienceFilters.shape)
  .extend(educationFilters.shape)
  .refine((f) => yearBoundsOk(f.years_experience), {
    message: 'years_experience lower bound must not exceed the upper bound',
    path: ['years_experience'],
  })

export type SearchFilters = z.infer<typeof searchFilters>
export type ParsedSearch = { filters: SearchFilters; unsupported: string[] }
export type StoredFilters = SearchFilters & { unsupported?: string[] }

const DEGREE_ALIASES: Record<string, 'BA' | 'BS' | 'MBA' | 'MS' | 'PhD'> = {
  ba: 'BA', bs: 'BS', mba: 'MBA', ms: 'MS', phd: 'PhD',
}

export function normalizeDegree(value: string) {
  return DEGREE_ALIASES[value.trim().toLowerCase().replaceAll('.', '')] ?? value.trim()
}

const LEGACY_KEYS: Record<string, string> = {
  openToWork: 'open_to_work',
  companyType: 'company_type',
  educationDegree: 'degree',
  educationSchool: 'school',
  educationField: 'field',
  currentCompany: 'current_company',
  previousCompanies: 'company',
  jobTitle: 'title',
}

function stripNulls(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined))
}

function readUnsupported(value: unknown) {
  if (value === true) return ['unsupported requirement']
  if (Array.isArray(value) && value.length === 0) return []
  if (Array.isArray(value) && value.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 200)) {
    return value.map((s) => s.trim())
  }
  if (value == null || value === false) return []
  return ['unsupported requirement']
}

export function normalizeSearchFilters(raw: unknown): { filters: unknown; unsupported: string[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { filters: raw, unsupported: [] }
  const o = { ...(raw as Record<string, unknown>) }
  const unsupported = 'unsupported' in o ? readUnsupported(o.unsupported) : []
  delete o.unsupported
  if (o.years_experience === undefined) {
    const bounds: YearCompare[] = []
    if (o.minYearsExperience !== undefined) bounds.push({ operator: 'gte', value: o.minYearsExperience as number })
    if (o.maxYearsExperience !== undefined) bounds.push({ operator: 'lte', value: o.maxYearsExperience as number })
    if (bounds.length === 1) o.years_experience = bounds[0]
    else if (bounds.length > 1) o.years_experience = bounds
  }
  delete o.minYearsExperience
  delete o.maxYearsExperience
  for (const [from, to] of Object.entries(LEGACY_KEYS)) {
    if (o[to] === undefined && o[from] !== undefined) o[to] = o[from]
    delete o[from]
  }
  if (typeof o.seniority === 'string') o.seniority = o.seniority.trim().toLowerCase()
  if (typeof o.company_type === 'string') o.company_type = o.company_type.trim().toLowerCase()
  if (typeof o.degree === 'string') o.degree = normalizeDegree(o.degree)
  return { filters: stripNulls(o), unsupported }
}

export function parseSearchFilters(raw: unknown) {
  const normalized = normalizeSearchFilters(raw)
  const parsed = searchFilters.safeParse(normalized.filters)
  if (!parsed.success) return { success: false as const, error: parsed.error }
  return { success: true as const, data: { filters: parsed.data, unsupported: normalized.unsupported } }
}

export function toStoredFilters(parsed: ParsedSearch): StoredFilters {
  return parsed.unsupported.length ? { ...parsed.filters, unsupported: parsed.unsupported } : parsed.filters
}

export const searchRequestBody = z
  .strictObject({
    brief: text(2000).optional(),
    filters: z.unknown().optional(),
    preview: z.boolean().optional(),
    page: z.number().int().min(1).max(1000).optional(),
  })
  .refine((b) => b.brief !== undefined || b.filters !== undefined, { message: 'brief or filters is required' })
