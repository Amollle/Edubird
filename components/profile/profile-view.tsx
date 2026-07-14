import Link from 'next/link';
import type { HistoryEntry, UserProfile } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { ProfileHeader } from '@/components/profile/profile-header';

type Props = {
  profile: UserProfile;
  history: HistoryEntry[];
  guest?: boolean;
};

export function ProfileView({ profile, history, guest }: Props) {
  return (
    <div className="profile-shell">
      <section className="stack">
        <ProfileHeader profile={profile} guest={guest} />
      </section>

      <section className="card pad" style={{ display: 'grid', gap: 20 }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem, 2vw, 2rem)' }}>Reading History</h2>
          <Link href="/history" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            View All
          </Link>
        </div>

        <div className="history-list">
          {history.length > 0 ? (
            history.map((entry) => (
              <article className="history-item" key={entry.id}>
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span className="badge">{entry.topic}</span>
                    <span className="badge success">{entry.scorePercent != null ? 'Completed' : 'Not Attempted'}</span>
                  </div>
                  <h3 className="history-title">{entry.title}</h3>
                  <div className="muted small">
                    Read on {formatDate(entry.createdAt)} · {entry.wordCount} words
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>
                    {guest || entry.scorePercent == null ? '--' : `${entry.scorePercent}%`}
                  </div>
                  <div className="muted small">Quiz Score</div>
                </div>
              </article>
            ))
          ) : (
            <div className="muted">No reading history yet.</div>
          )}
        </div>

        {guest && (
          <div className="card pad" style={{ background: 'var(--surface-mid)', boxShadow: 'none' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Only the last 3 activities are visible as a guest.</div>
            <div style={{ marginTop: 12, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
              Create Account to See Full History
            </div>
          </div>
        )}

        {!guest && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Articles Read</div>
              <div className="stat-value">{history.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Quiz Average</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {(() => {
                  const scored = history.filter((entry) => entry.scorePercent != null);
                  if (scored.length === 0) {
                    return '--';
                  }
                  const average = Math.round(
                    scored.reduce((sum, entry) => sum + (entry.scorePercent ?? 0), 0) / scored.length
                  );
                  return `${average}%`;
                })()}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
