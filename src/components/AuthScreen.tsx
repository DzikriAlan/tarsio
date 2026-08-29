import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { translate } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AuthScreen({ lang }: { lang: Language }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'signup'
      ? await signUp(email, password, name || email.split('@')[0], lang)
      : await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error.includes('already') ? t('auth.exists') : t('auth.error'));
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
          {mode === 'signup' && (
            <input
              type="text"
              placeholder={t('auth.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input"
              required
            />
          )}
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
            minLength={6}
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
