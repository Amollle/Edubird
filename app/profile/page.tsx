import { AppShell } from '@/components/app-shell';
import { ProfileView } from '@/components/profile/profile-view';
import { requireUser } from '@/lib/auth';
import { listHistory } from '@/lib/data';

export default async function ProfileRoute() {
  const profile = await requireUser();
  const history = await listHistory(profile.id, 6);

  return (
    <AppShell active="profile" userName={profile.displayName} isGuest={profile.isGuest}>
      <ProfileView profile={profile} history={history} />
    </AppShell>
  );
}
