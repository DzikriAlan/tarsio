import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { translate } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AuthScreen({ lang }: { lang: Language }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);

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
