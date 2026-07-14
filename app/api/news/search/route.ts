import { NextResponse } from 'next/server';
import { searchNewsArticles } from '@/lib/news';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topic = url.searchParams.get('topic') || '';

  try {
    const articles = await searchNewsArticles(topic);
    return NextResponse.json({ success: true, articles });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search news.'
      },
      { status: 500 }
    );
  }
}
