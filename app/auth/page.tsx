import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AuthPage } from '@/components/auth/auth-page';

export default async function AuthRoute() {
  const user = await getSessionUser();
  if (user) {
    redirect('/generator');
  }

  return <AuthPage />;
}
