import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

        const response = await fetch(`${backendUrl}/api/voter/motions/live`, {
            method: 'GET',
            headers: { 'Authorization': authHeader },
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        console.error('Live Motion Proxy Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
