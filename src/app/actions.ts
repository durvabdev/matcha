'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'matcha_session'
const SESSION_SECONDS = 60 * 60

export type LoginResult = { ok: true } | { error: string }

export async function login(email: string, password: string): Promise<LoginResult> {
  const invalid = { error: 'Incorrect email or password.' }
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return invalid
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error || !data.session) return invalid

    ;(await cookies()).set(SESSION_COOKIE, data.session.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_SECONDS,
    })
    return { ok: true }
  } catch {
    return { error: 'Sign-in is unavailable. Try again in a moment.' }
  }
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
