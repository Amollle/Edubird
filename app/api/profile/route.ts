import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { readProfile } from '@/lib/data';

const UpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  gradeLevel: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'university']).optional(),
  avatarUrl: z.string().url().optional().nullable()
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

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await readProfile(user.id);
  return NextResponse.json({ success: true, profile });
}

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = UpdateSchema.parse(await request.json());
  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const admin = createSupabaseAdminClient();
  const current = await readProfile(user.id);
  const { error } = await admin
    .from('profiles')
    .update({
      display_name: body.displayName ?? current.displayName,
      grade_level: body.gradeLevel ?? current.gradeLevel,
      avatar_url: body.avatarUrl === undefined ? current.avatarUrl ?? null : body.avatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const profile = await readProfile(user.id);
  return NextResponse.json({ success: true, profile });
}
