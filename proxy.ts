import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/utils/rate-limit'

function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || crypto.randomUUID()
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || forwarded

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}

export async function proxy(request: NextRequest) {
  const requestId = getRequestId(request)

  if (request.nextUrl.pathname.startsWith('/api/') && request.method === 'POST') {
    const clientId = getClientId(request)

    const rate = checkRateLimit(`mw:api:post:${clientId}`, 60, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'x-request-id': requestId,
          },
        }
      )
    }
  }

  const { response, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)

    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    redirect.headers.set('x-request-id', requestId)
    return redirect
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'

    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    redirect.headers.set('x-request-id', requestId)
    return redirect
  }

  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
