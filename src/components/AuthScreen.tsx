import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { translate } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { Sparkles, ArrowRight } from 'lucide-react';

// Lucide tidak punya logo Google; ini mark 4-warna resmi sebagai inline SVG.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function AuthScreen({ lang }: { lang: Language }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    const result = await signInWithGoogle(lang);
    if (result.error) {
      setGoogleLoading(false);
      setError(t('auth.googleError'));
    }
    // Sukses → Supabase redirect ke Google, jadi tak perlu reset loading.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'signup'
      ? await signUp(username, password, lang)
      : await signIn(username, password);
    setLoading(false);
    if (result.error) {
      const code = result.code ?? '';
      const raw = result.error.toLowerCase();
      if (code === 'email_provider_disabled' || code === 'signup_disabled' || raw.includes('signups are disabled')) {
        setError(t('auth.signupDisabled'));
      } else if (code === 'weak_password' || raw.includes('at least 6')) {
        setError(t('auth.weakPassword'));
      } else if (code === 'user_already_exists' || raw.includes('already')) {
        setError(t('auth.exists'));
      } else if (code === 'email_not_confirmed' || raw.includes('not confirmed')) {
        setError(t('auth.unconfirmed'));
      } else if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || raw.includes('rate limit')) {
        setError(t('auth.rateLimit'));
      } else if (code === 'invalid_credentials' || raw.includes('invalid login')) {
        setError(t('auth.error'));
      } else {
        setError(result.error);
      }
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><span>t</span></div>
          <span className="brand-name">tarsio</span>
        </div>
        <div className="auth-spark"><Sparkles size={28} /></div>
        <h1>{t('auth.welcome')}</h1>
        <p>{t('auth.subtitle')}</p>
        <button
          type="button"
          className="auth-google"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
        >
          <GoogleGlyph />
          {googleLoading ? t('auth.loading') : t('auth.google')}
        </button>
        <div className="auth-divider"><span>{t('auth.or')}</span></div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
            className="auth-input"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            required
            minLength={3}
          />
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.loading') : mode === 'signup' ? t('auth.signup') : t('auth.login')}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
        >
          {mode === 'signup' ? t('auth.toLogin') : t('auth.toSignup')}
        </button>
      </div>
    </div>
  );
}
