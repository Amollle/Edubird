import { AppShell } from '@/components/app-shell';
import { ProfileView } from '@/components/profile/profile-view';
import { getGuestProfile } from '@/lib/auth';
import { getFallbackArticles } from '@/lib/mock-data';

export default async function GuestRoute() {
  const profile = getGuestProfile();
  const history = getFallbackArticles('guest').map((article, index) => ({
    id: `${index}`,
    title: article.title,
    topic: article.category || 'Demo',
    source: article.source,
    gradeLevel: '9' as const,
    length: 'short' as const,
    wordCount: article.summary.split(/\s+/).length,
    createdAt: article.publishedAt || new Date().toISOString(),
    passageId: `${index}`,
    imageUrl: article.imageUrl
  }));

  return (
    <AppShell active="profile" userName={profile.displayName} isGuest>
      <ProfileView profile={profile} history={history} guest />
    </AppShell>
  );
}
