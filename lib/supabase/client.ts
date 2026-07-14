import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      auth: {
        async signUp() {
          return { data: null, error: new Error('Supabase is not configured yet.') };
        },
        async signInWithPassword() {
          return { data: null, error: new Error('Supabase is not configured yet.') };
        },
        async signOut() {
          return { error: null };
        },
        async resend() {
          return { data: null, error: new Error('Supabase is not configured yet.') };
        },
        async signInWithOAuth() {
          return { data: null, error: new Error('Supabase is not configured yet.') };
        }
      }
    } as const;
  }

  return createBrowserClient(url, anonKey);
}
