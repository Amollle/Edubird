import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateReadingPackage } from '@/lib/generation';
import { createReadingRecord, readProfile } from '@/lib/data';
import type { GradeLevel, PassageLength } from '@/lib/types';

const BodySchema = z.object({
  article: z.object({
    title: z.string(),
    source: z.string(),
    summary: z.string(),
    link: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    publishedAt: z.string().optional().nullable()
  }),
  gradeLevel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'university']),
  length: z.enum(['short', 'medium', 'long']),
  questionCount: z.number().int().min(3).max(15)
});

async function getUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const user = await getUser();

    const packageResult = await generateReadingPackage({
      article: {
        title: body.article.title,
        source: body.article.source,
        summary: body.article.summary,
        link: body.article.link ?? '',
        imageUrl: body.article.imageUrl ?? undefined,
        category: body.article.category ?? body.article.title
      },
      gradeLevel: body.gradeLevel as GradeLevel,
      length: body.length as PassageLength,
      questionCount: body.questionCount
    });

    if (user) {
      const profile = await readProfile(user.id);

      await createReadingRecord({
        userId: user.id,
        passage: packageResult.passage,
        questions: packageResult.questions
      });

      return NextResponse.json({
        success: true,
        guest: false,
        passage: packageResult.passage,
        questions: packageResult.questions,
        profile
      });
    }

    return NextResponse.json({
      success: true,
      guest: true,
      passage: packageResult.passage,
      questions: packageResult.questions,
      profile: {
        id: 'guest',
        email: '',
        displayName: 'Guest',
        gradeLevel: body.gradeLevel,
        isGuest: true
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate passage.'
      },
      { status: 500 }
    );
  }
}
