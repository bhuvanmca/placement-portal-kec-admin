import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileUrl = searchParams.get('url');
    const fileName = searchParams.get('filename');

    if (!fileUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: response.status });
        }

        const headers = new Headers(response.headers);
        headers.set('Content-Disposition', `attachment; filename="${fileName || 'download'}"`);
        
        // Remove CORS headers from upstream if present, as we are serving from same origin
        headers.delete('Access-Control-Allow-Origin');

        return new NextResponse(response.body, {
            status: 200,
            headers: headers,
        });
    } catch (error) {
        console.error("Proxy download error:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
