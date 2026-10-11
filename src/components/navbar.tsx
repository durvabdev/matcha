'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/actions'

const item =
  'focus-ring rounded-md px-3 py-1.5 text-sm font-bold text-black no-underline hover:bg-[#7d9b76] hover:text-white'

// The one nav bar used on every signed-in page. The home screen passes its own sign-out
// so it can slide back to the login panel without a reload.
export function NavBar({ onSignOut }: { onSignOut?: () => void }) {
  const router = useRouter()
  const path = usePathname()

  async function signOut() {
    if (onSignOut) return onSignOut()
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-[var(--kiln)] px-6 py-6 sm:px-10">
      <Link href="/" className="font-display text-xl text-[var(--text-primary)]">matcha</Link>
      <nav className="flex items-center gap-6">
        <Link href="/shortlists" className={`${item} ${path === '/shortlists' ? 'bg-[#7d9b76] text-white' : ''}`}>SHORTLISTS</Link>
        <Link href="/saved-briefs" className={`${item} ${path === '/saved-briefs' ? 'bg-[#7d9b76] text-white' : ''}`}>BRIEFS</Link>
        <button type="button" className={item} onClick={signOut}>SIGN OUT</button>
      </nav>
    </header>
  )
}
