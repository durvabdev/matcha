import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import App from '@/App'
import type { CompanyPlan } from '@/components/plan-indicator'
import { recruiterFromToken } from '@/lib/auth'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; upgrade?: string }>
}) {
  const q = await searchParams
  const token = (await cookies()).get('matcha_session')?.value
  let email: string | null = null
  let initialPlan: CompanyPlan | undefined
  if (token && process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await supabase.auth.getClaims(token)
    email = typeof data?.claims.email === 'string' ? data.claims.email : null

    const recruiter = await recruiterFromToken(token)
    if (!recruiter.error) {
      const { data: plan } = await recruiter.db
        .from('company_plans')
        .select('plan, searches_used')
        .eq('company_id', recruiter.companyId)
        .maybeSingle()
      if (plan?.plan === 'paid') initialPlan = { plan: 'paid', searches_remaining: null }
      else if (plan) initialPlan = { plan: 'free', searches_remaining: Math.max(0, 1 - plan.searches_used) }
    }
  }
  if (typeof q.search === 'string' && q.search) redirect(`/search/${q.search}`)
  const initialUpgrade = q.upgrade === '1' || q.upgrade === 'true'
  return <App initialEmail={email} initialPlan={initialPlan} initialUpgrade={initialUpgrade} />
}
