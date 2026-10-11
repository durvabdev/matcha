import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max)
const years = z.number().int().min(0).max(60)

// Structured candidate-search filters. Every key is optional; unknown keys are rejected.
// This is the shape the future LLM search should also produce.
export const searchFilters = z
  .strictObject({
    skills: z.array(text(50)).max(20),
    role: text(100),
    seniority: z.enum(['junior', 'mid', 'senior', 'staff']),
    city: text(100),
    state: text(100),
    country: text(100),
    minYearsExperience: years,
    maxYearsExperience: years,
    openToWork: z.boolean(),
  })
  .partial()
  .refine(
    (f) => f.minYearsExperience === undefined || f.maxYearsExperience === undefined || f.minYearsExperience <= f.maxYearsExperience,
    { message: 'minYearsExperience must not exceed maxYearsExperience', path: ['minYearsExperience'] },
  )

export type SearchFilters = z.infer<typeof searchFilters>

// strictObject: a client-sent company_id (or any other extra key) is a 400.
export const createSavedBriefBody = z.strictObject({
  brief: text(2000),
  filters: searchFilters.default({}),
})
