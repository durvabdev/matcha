import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoredFilters } from './schema'

export const PROFILE_COLUMNS = 'id, full_name, avatar_url, current_title, current_company, years_experience, city, seniority, open_to_work, skills'

export type CandidateProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  current_title: string | null
  current_company: string | null
  years_experience: number | null
  city: string | null
  seniority: string | null
  open_to_work: boolean
  skills: string[]
}

export async function matchCandidates(db: SupabaseClient, filters: StoredFilters) {
  const { data, error } = await db.rpc('match_candidates', { filters })
  if (error) throw error
  return (data ?? []) as { id: string; score: number }[]
}

export async function loadCandidateProfiles(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [] as CandidateProfile[]
  const { data, error } = await db.from('candidates').select(PROFILE_COLUMNS).in('id', ids)
  if (error) throw error
  const byId = new Map((data ?? []).map((c) => [c.id, c as CandidateProfile]))
  return ids.map((id) => byId.get(id)).filter((c): c is CandidateProfile => !!c)
}
