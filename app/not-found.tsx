import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card pad" style={{ maxWidth: 560, textAlign: 'center' }}>
        <h1 style={{ marginTop: 0, fontSize: 40, letterSpacing: '-0.04em' }}>Page not found</h1>
        <p className="muted">The page you requested does not exist or has moved.</p>
        <Link href="/generator" className="button-primary" style={{ marginTop: 20 }}>
          Back to Edubird.ai
        </Link>
      </div>
    </main>
  );
}
