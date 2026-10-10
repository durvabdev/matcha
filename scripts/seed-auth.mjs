// Local test credentials only. Never reuse rotto-assessment on a deployed app.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY
if (!url || !secret || !publishable) {
  console.error('Missing Supabase env. Run make setup.')
  process.exit(1)
}

const host = new URL(url).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`Refusing to seed auth against ${host}. This script is local-only.`)
  process.exit(1)
}

const PASSWORD = 'rotto-assessment'
const USERS = [
  { email: 'recruiter@acme.test', slug: 'acme' },
  { email: 'recruiter@globex.test', slug: 'globex' },
]

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function userId(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (!error) return data.user.id
  const exists = error.code === 'email_exists' || /already been registered/i.test(error.message)
  if (!exists) throw error
  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw listError
  const found = list.users.find((user) => user.email === email)
  if (!found) throw error
  return found.id
}

for (const { email, slug } of USERS) {
  const id = await userId(email)
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()
  if (companyError) throw companyError
  const { error } = await admin.from('recruiters').upsert({ id, company_id: company.id })
  if (error) throw error
}

const anon = createClient(url, publishable, {
  auth: { persistSession: false, autoRefreshToken: false },
})
for (const { email } of USERS) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`)
  console.log(`signed in ${email}`)
}
