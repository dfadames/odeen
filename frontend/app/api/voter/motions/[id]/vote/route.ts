import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/voter/motions/${id}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        console.error('Vote Submission Proxy Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
