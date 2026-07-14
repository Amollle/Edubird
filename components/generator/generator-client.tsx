'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Atom,
  Bot,
  Briefcase,
  Clapperboard,
  CloudSun,
  Cpu,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Loader2,
  Minus,
  Palette,
  Plus,
  Rocket,
  Scale,
  Sparkles,
  Trophy
} from 'lucide-react';
import { type ArticleSource, type GradeLevel, type PassageLength } from '@/lib/types';
import { clamp } from '@/lib/utils';

const topicChips = [
  { label: 'Science', icon: Atom },
  { label: 'Technology', icon: Cpu },
  { label: 'AI', icon: Bot },
  { label: 'History', icon: Landmark },
  { label: 'Politics', icon: Scale },
  { label: 'Sports', icon: Trophy },
  { label: 'Nature', icon: Leaf },
  { label: 'Art', icon: Palette },
  { label: 'Health', icon: HeartPulse },
  { label: 'Space Exploration', icon: Rocket },
  { label: 'Climate Change', icon: CloudSun },
  { label: 'Business', icon: Briefcase },
  { label: 'Entertainment', icon: Clapperboard },
  { label: 'Education', icon: GraduationCap }
];

const gradeOptions: Array<{ value: GradeLevel; label: string }> = [
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
  { value: 'university', label: 'University / Adult' }
];

const lengthOptions: Array<{ value: PassageLength; title: string; subtitle: string }> = [
  { value: 'short', title: 'Short', subtitle: '~200 words' },
  { value: 'medium', title: 'Medium', subtitle: '~500 words' },
  { value: 'long', title: 'Long', subtitle: '~1000 words' }
];

type Props = {
  initialGradeLevel: GradeLevel;
  displayName: string;
  isGuest?: boolean;
};

export function GeneratorClient({ initialGradeLevel, displayName, isGuest = false }: Props) {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(initialGradeLevel);
  const [questionCount, setQuestionCount] = useState(5);
  const [length, setLength] = useState<PassageLength>('short');
  const [articles, setArticles] = useState<ArticleSource[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Pick a topic above to find current news for a learning passage.');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (selectedArticle) {
      setStatus(`Selected "${selectedArticle.title}". Ready to generate.`);
    }
  }, [selectedArticle]);

  async function search(topicValue: string) {
    const query = topicValue.trim();
    if (!query) {
      setStatus('Select a topic above to search current news.');
      return [];
    }

    setLoading(true);
    setStatus(`Searching for news about "${query}"...`);

    try {
      const response = await fetch(`/api/news/search?topic=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setArticles(data.articles);
        setSelectedArticle(data.articles[0] ?? null);
        setStatus(data.articles.length > 0 ? `Found ${data.articles.length} articles.` : 'No direct matches found. Using fallback stories.');
        return data.articles as ArticleSource[];
      } else {
        setStatus(data.error || 'Search failed.');
        return [];
      }
    } catch {
      setStatus('Unable to search news right now.');
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedArticle) {
      const results = await search(topic);
      const article = results[0];
      if (!article) {
        return;
      }
      setSelectedArticle(article);
      await handleGenerateFromArticle(article);
      return;
    }

    await handleGenerateFromArticle(selectedArticle);
  }

  async function handleGenerateFromArticle(article: ArticleSource) {
    setIsGenerating(true);
    startTransition(async () => {
      setStatus('Generating passage and questions...');
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article,
            gradeLevel,
            length,
            questionCount
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setStatus(data.error || 'Generation failed.');
          return;
        }

        if (isGuest) {
          sessionStorage.setItem(`nl_guest_passage_${data.passage.id}`, JSON.stringify({
            passage: data.passage,
            questions: data.questions
          }));
          router.push(`/passage/${data.passage.id}?guest=1`);
        } else {
          router.push(`/passage/${data.passage.id}`);
        }
        router.refresh();
      } finally {
        setIsGenerating(false);
      }
    });
  }

  return (
    <div className="stack">
      <section className="hero">
        <h1>Create Custom Learning Passage</h1>
        <p>Tailor educational content to your specific needs using our AI-powered generator.</p>
      </section>

      <section className="card pad">
        <label className="field-label">What should it be about?</label>
        <div className="topic-grid">
          {topicChips.map(({ label, icon: Icon }) => (
            <button
              type="button"
              key={label}
              className="topic-chip"
              data-active={topic === label}
              onClick={() => {
                setTopic(label);
                void search(label);
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="split">
        <section className="card pad">
          <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--primary)" />
            Grade Level
          </label>
          <select className="select" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value as GradeLevel)}>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <section className="card pad">
          <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--primary)" />
            Assessment
          </label>
          <div className="stepper">
            <button type="button" className="icon-stepper" onClick={() => setQuestionCount((current) => clamp(current - 1, 3, 15))}>
              <Minus size={18} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div className="stepper-value">{questionCount}</div>
              <div className="muted">Questions</div>
            </div>
            <button type="button" className="icon-stepper" onClick={() => setQuestionCount((current) => clamp(current + 1, 3, 15))}>
              <Plus size={18} />
            </button>
          </div>
        </section>
      </div>

      <section className="card pad">
        <label className="field-label">Passage Length</label>
        <div className="grid-3">
          {lengthOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="choice-card"
              data-active={length === option.value}
              onClick={() => setLength(option.value)}
            >
              <div className="choice-title">{option.title}</div>
              <div className="choice-subtitle">{option.subtitle}</div>
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
        <button
          className="button-primary"
          onClick={() => void handleGenerate()}
          disabled={loading || pending || isGenerating}
          style={{ minWidth: 220, justifyContent: 'center' }}
        >
          {isGenerating || pending ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>Generate Passage</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
        {(isGenerating || pending) && (
          <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} className="spin" />
            {status || 'Generating your passage and questions...'}
          </div>
        )}
        <div className="muted small">Estimated generation time: ~15 seconds</div>
        <div className="badge" style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--primary)' }}>
          {displayName}
        </div>
      </div>

      <section className="card pad">
        <div className="card-header">
          <div>
            <div className="eyebrow">News Search</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{status}</div>
          </div>
          <button
            type="button"
            className="button-secondary"
            disabled={!topic}
            onClick={async () => { await search(topic); }}
          >
            Search Again
          </button>
        </div>
      </section>

      {articles.length > 0 && (
        <section className="card pad">
          <div className="field-label" style={{ marginBottom: 14 }}>
            Select an Article
          </div>
          <div className="article-list">
            {articles.map((article, index) => (
              <article
                key={`${article.title}-${index}`}
                className="article-item"
                onClick={() => setSelectedArticle(article)}
                role="button"
                tabIndex={0}
              >
                <div className="article-meta">
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-summary">{article.summary}</p>
                  <div className="article-subtle">
                    {article.source}
                    {article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span className="button-secondary" style={{ minHeight: 42 }}>
                  {selectedArticle?.title === article.title ? 'Selected' : 'Select'}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="card pad">
        <div className="eyebrow">Signed in as {displayName}</div>
      </section>
    </div>
  );
}
