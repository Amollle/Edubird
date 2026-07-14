import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PassageReader } from '@/components/passage/passage-reader';
import { GuestPassageView } from '@/components/passage/guest-passage-view';
import { getGuestProfile, getSessionUser, getUserProfile } from '@/lib/auth';
import { getPassageById } from '@/lib/data';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guest?: string }>;
};

export default async function PassagePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { guest } = await searchParams;
  const user = await getSessionUser();
  const record = await getPassageById(id);

  if (!user && (guest === '1' || !record)) {
    const profile = getGuestProfile();
    return (
      <AppShell active="generator" userName={profile.displayName} isGuest>
        <GuestPassageView passageId={id} />
      </AppShell>
    );
  }

  if (!record) {
    notFound();
  }

  const profile = (await getUserProfile()) ?? getGuestProfile();

  return (
    <AppShell active="generator" userName={profile.displayName} isGuest={profile.isGuest}>
      <PassageReader passage={record.passage} questions={record.questions} />
    </AppShell>
  );
}
