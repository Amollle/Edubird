import { NextResponse } from 'next/server';
import { z } from 'zod';
import { agnesGenerateImage } from '@/lib/agnes';

const Schema = z.object({
  prompt: z.string().min(1),
  size: z.enum(['1024x1024', '1024x1536', '1536x1024']).optional()
});

export async function POST(request: Request) {
  try {
    const body = Schema.parse(await request.json());
    if (!process.env.AGNES_API_KEY) {
      return NextResponse.json({ success: false, error: 'Image generation not configured.' }, { status: 501 });
    }

    const imageUrl = await agnesGenerateImage({
      prompt: body.prompt,
      size: body.size
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate image.'
      },
      { status: 500 }
    );
  }
}
