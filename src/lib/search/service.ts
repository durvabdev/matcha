import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoredFilters } from './schema'
import { parseSearchFilters } from './schema'
import { loadCandidateProfiles } from './query'

export const PAGE_SIZE = 20

export function searchesRemaining(plan: string, used: number) {
  return plan === 'paid' ? null : Math.max(0, 1 - used)
}

export async function getSearchPage(db: SupabaseClient, searchId: string, page: number) {
  const { data: search } = await db.from('searches').select('id, filters, total').eq('id', searchId).maybeSingle()
  if (!search) return { error: 'not_found' as const }

  const parsed = parseSearchFilters(search.filters)
  if (!parsed.success) return { error: 'load' as const }

  const from = (page - 1) * PAGE_SIZE
  const { data: rows, error } = await db
    .from('search_results')
    .select('candidate_id')
    .eq('search_id', searchId)
    .order('position')
    .range(from, from + PAGE_SIZE - 1)
  if (error) return { error: 'load' as const }

  const results = await loadCandidateProfiles(db, (rows ?? []).map((r) => r.candidate_id as string))
  return {
    search_id: search.id as string,
    filters: parsed.data.filters,
    unsupported: parsed.data.unsupported,
    total: search.total as number,
    results,
    page,
  }
}

export async function createSearch(db: SupabaseClient, input: { brief?: string; filters: StoredFilters }) {
  const { data, error } = await db.rpc('create_search', { p_brief: input.brief ?? null, p_filters: input.filters })
  if (error) {
    if (error.message.includes('quota_exceeded')) return { error: 'quota' as const }
    return { error: 'persist' as const }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.search_id) return { error: 'persist' as const }
  const page = await getSearchPage(db, row.search_id as string, 1)
  if ('error' in page) return { error: 'load' as const }
  return { ...page, searches_remaining: searchesRemaining(row.plan as string, row.searches_used as number) }
}
