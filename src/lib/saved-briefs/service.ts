import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoredFilters } from './schema'

const columns = 'id, brief, filters, created_at'

export function createSavedBrief(db: SupabaseClient, companyId: string, input: { brief: string; filters: StoredFilters }) {
  return db
    .from('saved_briefs')
    .insert({ company_id: companyId, brief: input.brief, filters: input.filters })
    .select(columns)
    .single()
}

export function listSavedBriefs(db: SupabaseClient) {
  return db.from('saved_briefs').select(columns).order('created_at', { ascending: false }).order('id', { ascending: false })
}
