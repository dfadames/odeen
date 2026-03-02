import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Setup token is required' },
        { status: 400 }
      )
    }

    // Call the Go Backend /api/admin/login
    // Assuming backend runs on 8080 locally or uses env var in production
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

    const response = await fetch(`${backendUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      const data = await response.json()
      return NextResponse.json(
        { error: data.error || 'Failed to authenticate with backend' },
        { status: response.status }
      )
    }

    // Success - Get the JWT
    const data = await response.json()
    const adminJwt = data.token

    // Create the Next.js response
    const nextResponse = NextResponse.json({ success: true, type: data.type })

    // Set HttpOnly, Secure cookie
    const isSecure = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https') || process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BASE_URL?.includes('192.168');

    nextResponse.cookies.set('admin_session', adminJwt, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return nextResponse
  } catch (error) {
    console.error('Admin Auth Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
