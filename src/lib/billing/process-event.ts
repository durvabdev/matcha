import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

function serviceDb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Privileged apply after the webhook has already verified the Stripe signature.
export async function processStripeEvent(event: Stripe.Event) {
  if (!TYPES.has(event.type)) return { ok: true as const }

  const obj = event.data.object as {
    id?: unknown
    status?: unknown
    metadata?: { company?: unknown }
  }
  const company = obj.metadata?.company
  if (
    (company !== 'acme' && company !== 'globex') ||
    typeof obj.id !== 'string' ||
    typeof obj.status !== 'string'
  ) {
    return { ok: true as const }
  }

  const { error } = await serviceDb().rpc('apply_stripe_event', {
    event_id: event.id,
    type: event.type,
    company_slug: company,
    subscription_id: obj.id,
    event_created: event.created,
    status: obj.status,
  })
  if (error) return { ok: false as const }
  return { ok: true as const }
}
