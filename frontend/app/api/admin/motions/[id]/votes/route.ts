import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminSession = request.cookies.get('admin_session')

        if (!adminSession) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/admin/motions/${id}/votes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminSession.value}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to get vote count' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Get Vote Count Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
