'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, BookOpenText, CheckCircle2, Clock3, Lightbulb, Sparkles, XCircle } from 'lucide-react';
import { type ReadingPassage, type ReadingQuestion } from '@/lib/types';
import { formatDate, gradeLevelLabel } from '@/lib/utils';

type Props = {
  passage: ReadingPassage;
  questions: ReadingQuestion[];
  /** Whether to persist the final quiz score to the server. False for guest sessions with no saved record. */
  persistScore?: boolean;
};

const typeLabels: Record<ReadingQuestion['type'], string> = {
  main_idea: 'Main Idea',
  detail: 'Detail',
  vocabulary: 'Vocabulary',
  inference: 'Inference',
  purpose: 'Purpose'
};

const WORDS_PER_MINUTE = 200;

export function PassageReader({ passage, questions, persistScore = true }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [scoreSaved, setScoreSaved] = useState(false);

  const answeredCount = Object.keys(selected).length;
  const totalQuestions = questions.length;

  const correctCount = useMemo(() => {
    return questions.reduce((count, question, questionIndex) => {
      const selectedIndex = selected[questionIndex];
      if (selectedIndex === undefined) {
        return count;
      }
      return question.options[selectedIndex] === question.answer ? count + 1 : count;
    }, 0);
  }, [questions, selected]);

  const isComplete = totalQuestions > 0 && answeredCount === totalQuestions;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const estimatedMinutes = Math.max(1, Math.round(passage.wordCount / WORDS_PER_MINUTE));

  useEffect(() => {
    setSelected({});
    setScoreSaved(false);
  }, [passage.id]);

  useEffect(() => {
    if (!isComplete || !persistScore || scoreSaved) {
      return;
    }

    setScoreSaved(true);
    void fetch('/api/history/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passageId: passage.id, scorePercent })
    }).catch(() => {
      // Best-effort: if this fails, the passage/questions are still saved;
      // only the score annotation is lost.
    });
  }, [isComplete, persistScore, scoreSaved, passage.id, scorePercent]);

  return (
    <div className="passage-shell">
      <article className="stack" style={{ gap: 18 }}>
        <section className="card pad">
          <div className="chip-row" style={{ marginTop: 0, marginBottom: 14 }}>
            <span className="badge success">{passage.topic}</span>
            <span className="badge">Level: {gradeLevelLabel(passage.gradeLevel)}</span>
          </div>

          <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(2rem, 3vw, 3.4rem)', lineHeight: 1.04, letterSpacing: '-0.05em' }}>
            {passage.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, color: 'var(--muted)', marginBottom: 18 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">📅</span>
              {formatDate(passage.createdAt)}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">⏱️</span>
              {estimatedMinutes} min read
            </span>
          </div>

          {passage.imageUrl && (
            <div style={{ position: 'relative', height: 380, borderRadius: 22, overflow: 'hidden', marginBottom: 24 }}>
              <Image src={passage.imageUrl} alt={passage.title} fill style={{ objectFit: 'cover' }} priority />
            </div>
          )}

          <div className="reading-text">
            {passage.text.split('\n\n').map((paragraph) => (
              <p key={paragraph.slice(0, 16)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="card pad quiz-card">
          <div className="card-header">
            <div className="field-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} color="var(--primary)" />
              Comprehension Questions
            </div>
          </div>

          {questions.map((question, questionIndex) => {
            const selectedIndex = selected[questionIndex];
            const hasAnswered = selectedIndex !== undefined;
            const selectedIsCorrect = hasAnswered && question.options[selectedIndex] === question.answer;

            return (
              <div key={`${question.type}-${questionIndex}`} className="question-card">
                <div className="eyebrow">
                  <Lightbulb size={14} />
                  {typeLabels[question.type]} {questionIndex + 1}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{question.question}</div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedIndex === optionIndex;
                    const isCorrectOption = option === question.answer;
                    const showCorrect = hasAnswered && isCorrectOption;
                    const showIncorrect = hasAnswered && isSelected && !isCorrectOption;

                    return (
                      <label
                        key={option}
                        className="option"
                        data-selected={isSelected}
                        style={
                          showCorrect
                            ? { borderColor: 'var(--success)', background: 'rgba(16,185,129,0.08)' }
                            : showIncorrect
                              ? { borderColor: '#dc2626', background: 'rgba(220,38,38,0.06)' }
                              : undefined
                        }
                      >
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          checked={isSelected}
                          disabled={hasAnswered}
                          onChange={() => {
                            setSelected((current) => ({ ...current, [questionIndex]: optionIndex }));
                          }}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ flex: 1 }}>{option}</span>
                        {showCorrect && <CheckCircle2 size={18} color="var(--success)" />}
                        {showIncorrect && <XCircle size={18} color="#dc2626" />}
                      </label>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div className="answer-box">
                    <strong>{selectedIsCorrect ? 'Correct!' : 'Not quite.'}</strong>{' '}
                    {selectedIsCorrect ? '' : <>The correct answer is: {question.answer}</>}
                    {question.explanation ? <div className="muted small" style={{ marginTop: 6 }}>{question.explanation}</div> : null}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: 'grid', justifyItems: 'center', gap: 8, marginTop: 8 }}>
            <button type="button" className="button-primary" onClick={() => router.push('/history')}>
              <span>{isComplete ? 'Finish & View History' : 'Finish Now & View History'}</span>
              <ArrowRight size={18} />
            </button>
            {!isComplete && totalQuestions > 0 && (
              <div className="muted small">
                You've answered {answeredCount} / {totalQuestions} questions — you can finish anytime.
              </div>
            )}
          </div>
        </section>
      </article>

      <aside className="stack" style={{ gap: 16 }}>
        <section className="card pad">
          <div className="eyebrow">{isComplete ? 'Quiz Score' : 'Quiz Progress'}</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: isComplete ? 'var(--success)' : 'var(--primary)' }}>
            {isComplete ? `${scorePercent}%` : `${answeredCount} / ${totalQuestions}`}
          </div>
          <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: '#d1fae5', overflow: 'hidden' }}>
            <div
              style={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                height: '100%',
                background: '#047857'
              }}
            />
          </div>
          <div className="muted small" style={{ textAlign: 'right', marginTop: 8 }}>
            {isComplete ? `${correctCount} / ${totalQuestions} correct` : 'Questions answered'}
          </div>
        </section>

        <section className="card pad" style={{ display: 'grid', justifyItems: 'center', textAlign: 'center' }}>
          <BookOpenText size={18} color="var(--primary)" />
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>{passage.wordCount}</div>
          <div className="muted small">words</div>
        </section>

        <section className="card pad" style={{ display: 'grid', justifyItems: 'center', textAlign: 'center' }}>
          <Clock3 size={18} color="var(--primary)" />
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>{estimatedMinutes} min</div>
          <div className="muted small">estimated read</div>
        </section>

        <section className="card pad" style={{ background: 'linear-gradient(180deg, #2d68e9, #1f56d6)', color: 'white', display: 'grid', gap: 12 }}>
          <div className="eyebrow" style={{ color: 'white' }}>
            <Sparkles size={14} />
            Focus Mode
          </div>
          <p style={{ margin: 0, opacity: 0.95 }}>Minimize distractions and enhance your reading comprehension.</p>
          <button className="button-secondary" style={{ width: '100%' }}>
            Activate Now
          </button>
        </section>
      </aside>
    </div>
  );
}
