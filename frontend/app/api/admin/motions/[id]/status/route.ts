import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pass through to Go Backend /api/admin/motions/:id/status
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminSession = request.cookies.get('admin_session')

        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing Admin Token' },
                { status: 401 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/admin/motions/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminSession.value}`,
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to update motion status' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Update Motion Status Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
