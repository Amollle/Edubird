import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AuthPage } from '@/components/auth/auth-page';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthRoute({ searchParams }: Props) {
  const user = await getSessionUser();
  if (user) {
    redirect('/generator');
  }

  const { error } = await searchParams;

  return <AuthPage initialError={error} />;
}
