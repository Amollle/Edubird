'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PassageReader } from '@/components/passage/passage-reader';
import type { ReadingPassage, ReadingQuestion } from '@/lib/types';

type Props = {
  passageId: string;
};

export function GuestPassageView({ passageId }: Props) {
  const [data, setData] = useState<{ passage: ReadingPassage; questions: ReadingQuestion[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`nl_guest_passage_${passageId}`);
      if (!raw) {
        setError('No saved passage was found for this guest session.');
        return;
      }
      const parsed = JSON.parse(raw) as { passage: ReadingPassage; questions: ReadingQuestion[] };
      setData(parsed);
    } catch {
      setError('Could not load the temporary passage data.');
    }
  }, [passageId]);

  if (error) {
    return (
      <div className="card pad" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>Guest Passage Not Found</h1>
        <p className="muted">{error}</p>
        <Link href="/generator" className="button-primary">
          Back to Generator
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card pad" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>Loading Passage</h1>
        <p className="muted">Retrieving your temporary guest passage...</p>
      </div>
    );
  }

  return <PassageReader passage={data.passage} questions={data.questions} persistScore={false} />;
}
