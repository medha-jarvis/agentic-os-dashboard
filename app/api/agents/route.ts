import { NextResponse } from 'next/server';
import { getAgentStatus } from '@/lib/api';

export async function GET() {
  try {
    const agents = await getAgentStatus();
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
