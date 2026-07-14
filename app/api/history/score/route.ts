import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordQuizScore } from '@/lib/data';

const BodySchema = z.object({
  passageId: z.string().min(1),
  scorePercent: z.number().min(0).max(100)
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
  const user = await getUser();
  if (!user) {
    // Guests have no persisted history row to update; treat this as a no-op
    // success rather than an error so the reader UI doesn't need special-case
    // handling for guest vs. signed-in users.
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const body = BodySchema.parse(await request.json());
    const scorePercent = await recordQuizScore({
      userId: user.id,
      passageId: body.passageId,
      scorePercent: body.scorePercent
    });

    return NextResponse.json({ success: true, scorePercent });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record quiz score.' },
      { status: 500 }
    );
  }
}
