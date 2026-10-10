import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import App from '@/App'

export default async function Page() {
  const token = (await cookies()).get('matcha_session')?.value
  let email: string | null = null
  if (token && process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await supabase.auth.getClaims(token)
    email = typeof data?.claims.email === 'string' ? data.claims.email : null
  }
  return <App initialEmail={email} />
}
