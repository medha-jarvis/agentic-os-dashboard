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

    console.log('[Proxy] Fetching from:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Dashboard/1.0',
      },
      cache: 'no-store',
      next: { revalidate: 0 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[Proxy] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('[Proxy] Data received successfully');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Proxy] Error details:', {
      message: error.message,
      stack: error.stack,
      url: `${API_BASE}/${(await params).path.join('/')}`,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch data from API',
        details: error.message,
        apiBase: API_BASE,
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

    console.log('[Proxy] POST to:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Dashboard/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[Proxy] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('[Proxy] POST completed successfully');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Proxy] POST Error:', {
      message: error.message,
      stack: error.stack,
      url: `${API_BASE}/${(await params).path.join('/')}`,
    });

    return NextResponse.json(
      {
        error: 'Failed to POST to API',
        details: error.message,
        apiBase: API_BASE,
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
