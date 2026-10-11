import type { SupabaseClient } from '@supabase/supabase-js'
import type { SearchFilters } from './schema'

const columns = 'id, brief, filters, created_at'

// `db` must be the caller's own client (user JWT) so RLS applies. companyId is the trusted
// value from the recruiters table; the insert policy checks it again.
export function createSavedBrief(db: SupabaseClient, companyId: string, input: { brief: string; filters: SearchFilters }) {
  return db
    .from('saved_briefs')
    .insert({ company_id: companyId, brief: input.brief, filters: input.filters })
    .select(columns)
    .single()
}

// RLS limits rows to the caller's company. ponytail: PostgREST caps this at max_rows (1000); add paging if needed.
export function listSavedBriefs(db: SupabaseClient) {
  return db.from('saved_briefs').select(columns).order('created_at', { ascending: false }).order('id', { ascending: false })
}
