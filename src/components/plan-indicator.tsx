'use client'

import { useEffect, useState } from 'react'
import { Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/easyui/button'

export type CompanyPlan =
  | { plan: 'paid'; searches_remaining: null }
  | { plan: 'free'; searches_remaining: number }

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="w-full max-w-lg rounded-2xl border border-[var(--paper)]/15 bg-white p-6 text-[var(--paper)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="upgrade-title" className="text-xl font-semibold">Upgrade your plan</h2>
          <button type="button" aria-label="Close" className="focus-ring rounded-sm text-[var(--paper)]/60 hover:text-[var(--paper)]" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-base">Unlock unlimited candidate searches with a paid plan.</p>
        <ul className="mt-4 space-y-2 text-base">
          <li className="flex items-center gap-2"><Check className="size-4 text-[var(--foam)]" /> Unlimited candidate searches</li>
          <li className="flex items-center gap-2"><Check className="size-4 text-[var(--foam)]" /> No one-search free-plan restriction</li>
        </ul>
        <p className="mt-5 text-sm text-[var(--paper)]/60">
          Upgrades are simulated in this demo. Subscription status is updated through verified Stripe webhook events. No payment is required.
        </p>
        <Button variant="secondary" fullWidth className="mt-6 rounded-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  )
}

export function PlanIndicator({ plan }: { plan: CompanyPlan }) {
  const [open, setOpen] = useState(false)
  const free = plan.plan === 'free'
  const left = free ? plan.searches_remaining : 0

  return (
    <>
      {/* Same inset as the nav (parent px-6 / sm:px-10), so this spans the bar. */}
      <div className="mt-8 w-full rounded-2xl border border-[var(--paper)]/15 bg-white px-5 py-4 text-[var(--paper)]">
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="size-4" />
            {free ? 'Free plan' : 'Paid plan'}
          </p>
          {free && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-[var(--paper)]/30 bg-transparent text-base text-[var(--paper)] hover:bg-[var(--paper)]/10"
              onClick={() => setOpen(true)}
            >
              Upgrade
            </Button>
          )}
        </div>
        <p className="mt-1 text-base text-[var(--paper)]/60">
          {free ? `${left} of 1 free searches remaining` : 'Unlimited searches'}
        </p>
        {free && (
          <div
            className="mt-3 h-1.5 bg-[var(--paper)]/15"
            role="meter"
            aria-label="Free searches remaining"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={left > 0 ? 1 : 0}
          >
            <div className="h-full bg-[var(--paper)]" style={{ width: left > 0 ? '100%' : '0%' }} />
          </div>
        )}
      </div>
      <UpgradeDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
