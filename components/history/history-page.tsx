import Link from 'next/link';
import type { HistoryEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type Props = {
  history: HistoryEntry[];
};

export function HistoryPage({ history }: Props) {
  return (
    <div className="stack">
      <section className="hero">
        <h1>Reading History</h1>
        <p>Track completed passages, question scores, and recent learning activity.</p>
      </section>

      <section className="card pad">
        <div className="history-list">
          {history.length > 0 ? (
            history.map((entry) => (
              <article className="history-item" key={entry.id}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span className="badge">{entry.topic}</span>
                    <span className="badge success">{entry.scorePercent != null ? 'Completed' : 'Not Attempted'}</span>
                  </div>
                  <h3 className="history-title">{entry.title}</h3>
                  <div className="muted small">
                    Read on {formatDate(entry.createdAt)} · {entry.wordCount} words
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--success)' }}>
                    {entry.scorePercent != null ? `${entry.scorePercent}%` : '--'}
                  </div>
                  <div className="muted small">Quiz Score</div>
                </div>
              </article>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-soft)' }}>
              No history yet. <Link href="/generator" style={{ color: 'var(--primary)', fontWeight: 700 }}>Generate a passage</Link>.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
