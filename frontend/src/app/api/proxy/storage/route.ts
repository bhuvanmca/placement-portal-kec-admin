import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const type = searchParams.get('type') || 'profile_photo';
    const token = request.headers.get('Authorization');

    if (!studentId) {
        return new NextResponse('Missing studentId parameter', { status: 400 });
    }

    if (!token) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const validTypes = ['profile_photo', 'resume'];
    if (!validTypes.includes(type)) {
        return new NextResponse('Invalid document type', { status: 400 });
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
        return new NextResponse('API URL not configured', { status: 500 });
    }

    const backendUrl = `${apiBaseUrl}/v1/admin/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(type)}/stream`;

    try {
        const response = await fetch(backendUrl, {
            headers: {
                'Authorization': token,
            },
        });

        if (!response.ok) {
            return new NextResponse(response.statusText, { status: response.status });
        }

        const headers = new Headers();
        let contentType = response.headers.get('Content-Type');
        // Force correct content type for known document types
        if (type === 'resume' && (!contentType || contentType === 'application/octet-stream')) {
            contentType = 'application/pdf';
        } else if (type === 'profile_photo' && (!contentType || contentType === 'application/octet-stream')) {
            contentType = 'image/jpeg';
        }
        if (contentType) {
            headers.set('Content-Type', contentType);
        }
        headers.set('Content-Disposition', type === 'resume' ? 'inline' : 'inline');
        headers.set('Cache-Control', 'private, max-age=3600');

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Storage proxy error:', error);
        return new NextResponse('Failed to fetch document', { status: 502 });
    }
}
