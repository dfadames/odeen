import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pass through to Go Backend /api/admin/motions/:id
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const adminSession = request.cookies.get('admin_session')
        const { id: motionId } = await context.params

        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing Admin Token' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/admin/motions/${motionId}`, {
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
                { error: data.error || 'Failed to update motion' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Update Motion Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const adminSession = request.cookies.get('admin_session')
        const { id: motionId } = await context.params

        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing Admin Token' },
                { status: 401 }
            )
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/admin/motions/${motionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminSession.value}`,
            },
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: data.error || 'Failed to delete motion' },
                { status: response.status }
            )
        }

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error('Delete Motion Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
