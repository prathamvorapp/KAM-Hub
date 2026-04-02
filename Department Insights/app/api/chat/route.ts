import { NextRequest, NextResponse } from 'next/server';
import { AIAnalyticsAgent } from '@/lib/ai-analytics-agent';

let agent: AIAnalyticsAgent | null = null;

async function getAgent() {
  if (!agent) {
    agent = new AIAnalyticsAgent();
    await agent.initialize();
  }
  return agent;
}

export async function POST(request: NextRequest) {
  try {
    const { message, action } = await request.json();

    const analyticsAgent = await getAgent();

    if (action === 'check') {
      const isConnected = await analyticsAgent.checkConnection();
      return NextResponse.json({ connected: isConnected });
    }

    if (action === 'clear') {
      analyticsAgent.clearHistory();
      return NextResponse.json({ success: true });
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await analyticsAgent.ask(message);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
