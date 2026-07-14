import Link from 'next/link';
import { CircleUserRound, History, Home, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

type AppShellProps = {
  active?: 'generator' | 'history' | 'profile';
  userName?: string;
  isGuest?: boolean;
  children: ReactNode;
};

const navItems = [
  { href: '/profile', label: 'Profile', key: 'profile' as const, icon: Home },
  { href: '/generator', label: 'Generator', key: 'generator' as const, icon: Sparkles },
  { href: '/history', label: 'History', key: 'history' as const, icon: History }
] as const;

export function AppShell({ active, userName, isGuest, children }: AppShellProps) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/generator" className="brand">
            Edubird.ai
          </Link>
          <nav className="topnav">
            {navItems.map((item) => {
              return (
                <Link key={item.key} href={item.href} data-active={active === item.key}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {userName ? <span className="muted small" style={{ fontWeight: 700 }}>{userName}</span> : null}
            <Link href={isGuest ? '/auth' : '/profile'} className="icon-btn" aria-label="Account">
              <CircleUserRound size={20} />
            </Link>
            {!isGuest ? <LogoutButton variant="icon" /> : null}
          </div>
        </div>
      </header>
      <main className="page-grid">
        <aside className="sidebar">
          <div className="sidebar-group">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="button-secondary"
                  style={{
                    justifyContent: 'flex-start',
                    background: active === item.key ? 'var(--primary-2)' : 'rgba(255,255,255,0.58)',
                    color: active === item.key ? 'white' : 'var(--text)',
                    borderColor: active === item.key ? 'var(--primary-2)' : 'var(--border)',
                    boxShadow: active === item.key ? 'var(--shadow-strong)' : 'none'
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <Link href="/guest" className="nav-link" data-active={false}>
              Support
            </Link>
            <Link href="/profile" className="nav-link" data-active={false}>
              Settings
            </Link>
            {!isGuest ? <LogoutButton variant="full" /> : null}
          </div>
        </aside>

        <section className="content">{children}</section>
      </main>
      <footer className="footer">
        <strong>Edubird.ai</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
          <a href="#">Resources</a>
          <a href="#">Support</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
        <div>© 2024 Edubird.ai Education. All rights reserved.</div>
      </footer>
    </>
  );
}
