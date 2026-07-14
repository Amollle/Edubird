import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeGradeLevel } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

function fallbackProfile(): UserProfile {
  return {
    id: 'guest',
    email: 'guest@newslearn.local',
    displayName: 'Guest',
    gradeLevel: '9',
    isGuest: true,
    avatarUrl: undefined
  };
}

export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function getUserProfile() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('id,email,display_name,grade_level,avatar_url,is_guest')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        email: data.email ?? user.email ?? '',
        displayName: data.display_name ?? user.user_metadata?.full_name ?? 'Learner',
        gradeLevel: normalizeGradeLevel(data.grade_level),
        avatarUrl: data.avatar_url ?? undefined,
        isGuest: data.is_guest ?? false
      } satisfies UserProfile;
    }
  } catch {
    return {
      id: user.id,
      email: user.email ?? '',
      displayName: (user.user_metadata?.full_name as string) ?? 'Learner',
      gradeLevel: normalizeGradeLevel(user.user_metadata?.grade_level as string | undefined),
      avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      isGuest: false
    };
  }

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: (user.user_metadata?.full_name as string) ?? 'Learner',
    gradeLevel: normalizeGradeLevel(user.user_metadata?.grade_level as string | undefined),
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
    isGuest: false
  };
}

export async function requireUser() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/auth');
  }
  return profile;
}

export function getGuestProfile(): UserProfile {
  return fallbackProfile();
}
