'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleUserRound, Mail, LockKeyhole, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

const quote = {
  text: 'The best way to learn is to understand the world as it happens. Edubird.ai makes that journey effortless and inspiring.',
  name: 'Elena Dracos',
  title: 'Ph.D. in Educational Psychology'
};

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('9');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'warning' | 'success'>('warning');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageTone('warning');

    startTransition(async () => {
      try {
        const { data, error } =
          mode === 'sign-up'
            ? await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: {
                    full_name: fullName,
                    grade_level: gradeLevel
                  }
                }
              })
            : await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          console.error('Supabase auth error:', error);
          const status = (error as { status?: number }).status;
          const isUnconfirmed = error.message?.toLowerCase().includes('email not confirmed');
          const readable = isUnconfirmed
            ? 'Please confirm your email before signing in. Check your inbox (and spam folder) for the confirmation link we sent you.'
            : error.message && error.message.trim().length > 0
              ? error.message
              : status === 429
                ? 'Too many attempts. Please wait a bit and try again.'
                : status
                  ? `Something went wrong (status ${status}). Please try again.`
                  : 'Unable to reach the server. Please check your connection and try again.';
          setMessage(readable);
          return;
        }

        if (mode === 'sign-up') {
          if (data.user && !data.session) {
            setMessageTone('success');
            setMessage('Almost there! Check your inbox for a confirmation email and click the link to activate your account before signing in.');
            setMode('sign-in');
            return;
          }
          // Email confirmations are disabled on this project, so signUp already produced a session.
          setMessage('Account created.');
          router.push('/generator');
          router.refresh();
          return;
        }

        setMessage('Signed in successfully.');
        router.push('/generator');
        router.refresh();
      } catch (err) {
        console.error('Supabase auth threw:', err);
        const name = err instanceof Error ? err.name : '';
        if (name === 'AuthRetryableFetchError') {
          setMessage(
            'Could not connect to the authentication server. This usually means your Supabase project is paused, the URL/key in .env.local is wrong, or the request is being blocked (ad blocker, firewall, offline). Check your Supabase project status and try again.'
          );
        } else {
          setMessage(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
        }
      }
    });
  }

  async function handleResendConfirmation() {
    if (!email) {
      setMessageTone('warning');
      setMessage('Enter your email address above first, then click "Resend confirmation email".');
      return;
    }

    setMessage('');
    startTransition(async () => {
      try {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) {
          console.error('Resend confirmation error:', error);
          setMessageTone('warning');
          setMessage(error.message || 'Could not resend the confirmation email. Please try again.');
          return;
        }
        setMessageTone('success');
        setMessage('A fresh confirmation email is on its way. Click the link as soon as it arrives.');
      } catch (err) {
        console.error('Resend confirmation threw:', err);
        setMessageTone('warning');
        setMessage(err instanceof Error && err.message ? err.message : 'Could not resend the confirmation email. Please try again.');
      }
    });
  }

  async function handleGoogleSignIn() {
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        console.error('Google sign-in error:', error);
        setMessageTone('warning');
        setMessage(error.message || 'Could not start Google sign-in. Please try again.');
      }
      // On success the browser is redirected to Google, so there's nothing else to do here.
    } catch (err) {
      console.error('Google sign-in threw:', err);
      setMessageTone('warning');
      setMessage(err instanceof Error && err.message ? err.message : 'Could not start Google sign-in. Please try again.');
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-marketing">
        <div>
          <div className="brand" style={{ color: 'white', marginBottom: 28 }}>
            Edubird.ai
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', letterSpacing: '-0.05em' }}>
            Empowered Learning through real-world context.
          </h1>
          <p style={{ marginTop: 14, maxWidth: 520, fontSize: 20, lineHeight: 1.5, opacity: 0.94 }}>
            Reading practice, comprehension questions, and student progress tools designed around current events.
          </p>
        </div>

        <div className="card pad" style={{ background: 'rgba(255,255,255,0.16)', color: 'white', borderColor: 'rgba(255,255,255,0.18)' }}>
          <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 800, opacity: 0.9 }}>99</div>
          <blockquote style={{ fontFamily: 'var(--font-reading)', fontSize: 22, lineHeight: 1.5, margin: '16px 0 24px' }}>
            “{quote.text}”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800
              }}
            >
              ED
            </div>
            <div>
              <div style={{ fontWeight: 800 }}>{quote.name}</div>
              <div style={{ opacity: 0.85 }}>{quote.title}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="segmented" role="tablist" aria-label="Authentication mode">
          <button type="button" data-active={mode === 'sign-in'} onClick={() => setMode('sign-in')}>
            Sign In
          </button>
          <button type="button" data-active={mode === 'sign-up'} onClick={() => setMode('sign-up')}>
            Sign Up
          </button>
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 'clamp(2rem, 3vw, 2.8rem)', letterSpacing: '-0.04em' }}>
            {mode === 'sign-in' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="muted" style={{ marginTop: 10, fontSize: 18 }}>
            {mode === 'sign-in'
              ? 'Access your personalized learning dashboard.'
              : 'Save your reading history and progress across devices.'}
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === 'sign-up' && (
            <>
              <div className="form-row">
                <label className="field-label">Full Name</label>
                <div className="search-wrap">
                  <CircleUserRound className="search-icon" size={18} />
                  <input className="input input-lg" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" />
                </div>
              </div>
              <div className="form-row">
                <label className="field-label">Grade Level</label>
                <select className="select" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)}>
                  <option value="1">1st Grade</option>
                  <option value="2">2nd Grade</option>
                  <option value="3">3rd Grade</option>
                  <option value="4">4th Grade</option>
                  <option value="5">5th Grade</option>
                  <option value="6">6th Grade</option>
                  <option value="7">7th Grade</option>
                  <option value="8">8th Grade</option>
                  <option value="9">9th Grade</option>
                  <option value="10">10th Grade</option>
                  <option value="11">11th Grade</option>
                  <option value="12">12th Grade</option>
                  <option value="university">University / Adult</option>
                </select>
              </div>
            </>
          )}

          <div className="form-row">
            <label className="field-label">Email Address</label>
            <div className="search-wrap">
              <Mail className="search-icon" size={18} />
              <input
                className="input input-lg"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="help-row">
              <label className="field-label" style={{ marginBottom: 0 }}>
                Password
              </label>
              <a href="#" className="small" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Forgot Password?
              </a>
            </div>
            <div className="search-wrap">
              <LockKeyhole className="search-icon" size={18} />
              <input
                className="input input-lg"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          </div>

          {message && (
            <div className={`badge ${messageTone}`} style={{ justifyContent: 'space-between' }}>
              <Sparkles size={16} />
              <span>{message}</span>
            </div>
          )}

          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>

          {mode === 'sign-in' && (
            <button
              type="button"
              className="button-secondary"
              disabled={pending}
              onClick={() => void handleResendConfirmation()}
            >
              Resend confirmation email
            </button>
          )}

          <div className="divider">Or continue with</div>

          <button
            type="button"
            className="button-secondary"
            onClick={() => void handleGoogleSignIn()}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.6l2.7-2.6C16.9 3.5 14.7 2.5 12 2.5 6.9 2.5 2.7 6.7 2.7 11.8S6.9 21 12 21c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.5H12z"
              />
              <path fill="#34A853" d="M4.4 7.5l3.3 2.4C8.6 7.6 10.1 6 12 6c1 0 2 .4 2.7 1l2.6-2.6C15.9 3.2 14.1 2.5 12 2.5 8.8 2.5 6 4.4 4.4 7.5z" />
              <path fill="#FBBC05" d="M12 21c2.6 0 4.8-.8 6.4-2.2l-3-2.4c-.9.6-2 .9-3.4.9-2.7 0-4.9-1.8-5.7-4.2l-3.3 2.5C4.6 18.7 8 21 12 21z" />
              <path fill="#4285F4" d="M21.2 11.6H12v3.8h5.2c-.6 1.8-2 3.3-3.8 4.1l3 2.4c2.8-2.1 4.4-5.4 4.4-9.3 0-.7-.1-1.5-.2-2z" />
            </svg>
            Google
          </button>
        </form>
      </section>
    </div>
  );
}
