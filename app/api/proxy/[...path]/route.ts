import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL || 'http://31.97.227.135:5000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${API_BASE}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log('[Proxy GET] Fetching from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[Proxy GET] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy GET] Error response:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Proxy GET] Data received, keys:', Object.keys(data).join(', '));

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    const resolvedParams = await params;
    console.error('[Proxy GET] Error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
      url: `${API_BASE}/${resolvedParams.path.join('/')}`,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch data from API',
        details: error.message,
        apiBase: API_BASE,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = `${API_BASE}/${path}`;

    console.log('[Proxy POST] Starting:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[Proxy POST] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy POST] Error response:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Proxy POST] Completed, received data');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    const resolvedParams = await params;
    console.error('[Proxy POST] Error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
      url: `${API_BASE}/${resolvedParams.path.join('/')}`,
    });

    return NextResponse.json(
      {
        error: 'Failed to POST to API',
        details: error.message,
        apiBase: API_BASE,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long operations
