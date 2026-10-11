import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { processStripeEvent } from '@/lib/billing/process-event'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(raw, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const result = await processStripeEvent(event)
  if (!result.ok) return NextResponse.json({ error: 'Failed to apply event' }, { status: 500 })
  return NextResponse.json({ received: true })
}
