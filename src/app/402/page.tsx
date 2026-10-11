import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/navbar'
import { NotFound } from '@/components/ui/not-found'

export default async function PaymentRequiredPage() {
  if (!(await cookies()).get('matcha_session')?.value) redirect('/')

  return (
    <div className="h-svh overflow-y-auto bg-[var(--kiln)] text-[var(--paper)]">
      <NavBar />
      <main className="flex min-h-[calc(100svh-6.5rem)] items-center justify-center px-6">
        <NotFound
          errorCode="402"
          badgeLabel="Error 402: Payment required"
          title="No more searches."
          description="The free plan includes one search. A paid plan is unlimited. Upgrades are simulated: subscription status changes only through verified Stripe webhook events. No payment is required."
        />
      </main>
    </div>
  )
}
