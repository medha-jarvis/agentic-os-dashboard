import { NextResponse } from 'next/server';
import { getPortfolioData } from '@/lib/api';

export async function GET() {
  try {
    const portfolio = await getPortfolioData();
    return NextResponse.json(portfolio);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
