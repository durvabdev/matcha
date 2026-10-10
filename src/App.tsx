'use client'

import { useState } from 'react'
import { Login, type LoginFormData } from '@/components/easyui/login'
import { login, logout } from '@/app/actions'

function nameFromEmail(email: string) {
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  return local || 'friend'
}

export default function App({ initialEmail }: { initialEmail: string | null }) {
  const [name, setName] = useState<string | null>(initialEmail ? nameFromEmail(initialEmail) : null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit({ email, password }: LoginFormData) {
    setError(null)
    setIsLoading(true)
    try {
      const result = await login(email, password)
      if ('error' in result) setError(result.error)
      else setName(nameFromEmail(email))
    } catch {
      setError('Could not sign in. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSignOut() {
    await logout()
    setName(null)
  }

  return (
    <div className="t-page-slide" data-page={name ? '2' : '1'}>
      <section className="t-page" data-page-id="1" aria-label="Matcha">
        <div className="grid h-svh grid-cols-1 bg-[var(--kiln)] md:grid-cols-[55%_45%]">
          <aside className="flex flex-col justify-center px-8 py-8 md:px-12">
            <h1 className="noren">matcha</h1>
            <p className="mt-3 max-w-[22ch] text-base text-[var(--paper)]/70">
              find your next match!
            </p>
          </aside>
          <div className="flex min-h-0 bg-[var(--bg)]">
            <Login
              className="flex h-full max-w-none flex-col justify-center rounded-none border-0 bg-transparent px-10 shadow-none sm:px-16"
              title="Come in"
              description="Sign in to your account."
              logo={
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#141414] font-display text-lg text-[#cfe0c8]">
                  抹
                </span>
              }
              showSocialLogins={false}
              error={error}
              isLoading={isLoading}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </section>

      <section className="t-page" data-page-id="2" aria-label="Welcome">
        <div className="flex h-svh flex-col bg-[var(--bg)]">
          <header className="flex items-center justify-between px-6 py-6 sm:px-10">
            <span className="font-display text-xl text-[var(--text-primary)]">matcha</span>
            <button
              type="button"
              className="focus-ring rounded-sm text-sm font-bold text-[var(--text-primary)] underline-offset-4 hover:underline"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </header>
          <div className="flex flex-1 items-center px-6 pb-24 sm:px-10">
            <div>
              <strong className="t-stagger-line t-stagger-line--1 font-display text-[clamp(2.4rem,8vw,5.5rem)] font-semibold leading-[0.95] text-[var(--text-primary)]">
                welcome {name}
              </strong>
              <span className="t-stagger-line t-stagger-line--2 mt-5 block max-w-[28ch] text-base leading-relaxed text-[#A1A1A1]">
                This room is a placeholder.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
