'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  variant?: 'icon' | 'full';
};

export function LogoutButton({ variant = 'icon' }: Props) {
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  function handleLogout() {
    setSigningOut(true);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/auth');
      router.refresh();
    });
  }

  const busy = pending || signingOut;

  if (variant === 'full') {
    return (
      <button
        type="button"
        className="button-secondary"
        style={{ justifyContent: 'flex-start' }}
        onClick={handleLogout}
        disabled={busy}
      >
        <LogOut size={18} />
        {busy ? 'Logging out...' : 'Log out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Log out"
      onClick={handleLogout}
      disabled={busy}
      title="Log out"
    >
      <LogOut size={20} />
    </button>
  );
}
