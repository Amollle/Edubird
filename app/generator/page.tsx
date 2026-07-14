import { AppShell } from '@/components/app-shell';
import { GeneratorClient } from '@/components/generator/generator-client';
import { getGuestProfile, getUserProfile } from '@/lib/auth';

export default async function GeneratorPage() {
  const profile = (await getUserProfile()) ?? getGuestProfile();

  return (
    <AppShell active="generator" userName={profile.displayName} isGuest={profile.isGuest}>
      <GeneratorClient
        initialGradeLevel={profile.gradeLevel}
        displayName={profile.displayName}
        isGuest={profile.isGuest}
      />
    </AppShell>
  );
}
