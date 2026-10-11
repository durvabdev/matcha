import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/402') return NextResponse.next()
  return NextResponse.next({ status: 402, statusText: 'Payment Required' })
}

export const config = { matcher: '/402' }
