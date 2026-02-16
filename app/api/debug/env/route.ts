import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      // Don't expose sensitive env vars, just the ones we need to debug
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get environment info',
      detail: String(error)
    }, { status: 500 });
  }
}