import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Routes to protect - anything starting with /admin or /projection
    // We'll also check if the Developer Sim buttons try to hit internal states.
    const path = request.nextUrl.pathname
    const isProtectedPath = path.startsWith('/admin') || path.startsWith('/projection')

    if (isProtectedPath) {
        // Look for the HttpOnly cookie set by our auth route
        const adminSession = request.cookies.get('admin_session')

        // If no valid session, redirect immediately and stop execution
        if (!adminSession) {
            // Depending on structure, either redirect to a 401 unauth page or root Waiting Room
            const url = request.nextUrl.clone()
            url.pathname = '/'
            // Could pass an error query param if desired: url.searchParams.set('auth', 'failed')
            return NextResponse.redirect(url)
        }
    }

    // Developer Footnote Simulation protection logic.
    // In `page.tsx`, the developer simulated UI uses React state `mode="admin"`.
    // To protect the API routes themselves, we secure `/api/admin/*`
    const isProtectedApi = path.startsWith('/api/admin')
    if (isProtectedApi && path !== '/api/auth/admin') {
        // Exclude the login route itself from this check
        // If they hit /api/admin/* natively, drop them if no session cookie
        const adminSession = request.cookies.get('admin_session')
        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing or invalid Admin Token' },
                { status: 401 }
            )
        }
        // We forward the Next.js Cookie as an Authorization Header so Gin can read the JWT
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('Authorization', `Bearer ${adminSession.value}`)

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
    }

    return NextResponse.next()
}

// Ensure middleware runs only on desired paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - api/auth/google (voter oauth route)
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth/google).*)',
    ],
}
