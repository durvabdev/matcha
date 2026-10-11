import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoredFilters } from './schema'

const columns = 'id, brief, filters, created_at, search_id'

export function normalizeBrief(brief: string) {
  return brief.charAt(0).toUpperCase() + brief.slice(1).toLowerCase()
}

export function findLatestSearchForBrief(db: SupabaseClient, brief: string) {
  return db
    .from('saved_briefs')
    .select('search_id')
    .eq('brief', normalizeBrief(brief))
    .not('search_id', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export function createSavedBrief(
  db: SupabaseClient,
  companyId: string,
  input: { brief: string; filters: StoredFilters; search_id?: string },
) {
  return db
    .from('saved_briefs')
    .insert({
      company_id: companyId,
      brief: normalizeBrief(input.brief),
      filters: input.filters,
      search_id: input.search_id ?? null,
    })
    .select(columns)
    .single()
}

export function listSavedBriefs(db: SupabaseClient) {
  return db.from('saved_briefs').select(columns).order('created_at', { ascending: false }).order('id', { ascending: false })
}
