import { NextResponse } from 'next/server';
import { getAllTasks } from '@/lib/api';

export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
