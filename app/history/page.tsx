import { AppShell } from '@/components/app-shell';
import { HistoryPage } from '@/components/history/history-page';
import { requireUser } from '@/lib/auth';
import { listHistory } from '@/lib/data';

export default async function HistoryRoute() {
  const profile = await requireUser();
  const history = await listHistory(profile.id, 12);

  return (
    <AppShell active="history" userName={profile.displayName} isGuest={profile.isGuest}>
      <HistoryPage history={history} />
    </AppShell>
  );
}
