'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/easyui/button'

export function RunSearch({ brief, filters }: { brief: string; filters: Record<string, unknown> }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const body = Object.keys(filters).length > 0 ? { filters } : { brief }
    const res = await fetch('/api/search', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 402) {
      router.push('/?upgrade=1')
      return
    }
    if (!res.ok) {
      setBusy(false)
      return
    }
    const data = (await res.json()) as { search_id: string }
    router.push(`/search/${data.search_id}`)
  }

  return (
    <Button type="button" size="sm" variant="outline" isLoading={busy} className="rounded-full border-white/30 bg-transparent text-[var(--paper)] hover:bg-white/10" onClick={() => void run()}>
      Run
    </Button>
  )
}
