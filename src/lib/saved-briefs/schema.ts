import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max)

export const createSavedBriefBody = z.strictObject({
  brief: text(2000),
  filters: z.unknown().default({}),
})

export {
  parseSearchFilters,
  searchFilters,
  searchRequestBody,
  toStoredFilters,
  type SearchFilters,
  type StoredFilters,
} from '../search/schema'
