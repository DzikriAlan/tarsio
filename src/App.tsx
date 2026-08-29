import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthScreen } from '@/components/AuthScreen';
import { Dashboard } from '@/components/Dashboard';
import type { Language } from '@/lib/types';
import { useState } from 'react';
import { translate } from '@/lib/i18n';

function AppContent() {
  const { session, profile, loading, language, setLanguage } = useAuth();
  const [guestLang, setGuestLang] = useState<Language>('id');
  const lang = session ? language : guestLang;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-orb"><div className="tarsy-face"><i /><i /><b /></div></div>
        <p>{translate(lang, 'auth.loading')}</p>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreenWrapper lang={lang} onLangChange={setGuestLang} />;
  }

  return <Dashboard />;
}

function AuthScreenWrapper({ lang, onLangChange }: { lang: Language; onLangChange: (l: Language) => void }) {
  return (
    <div className="lang-wrapper">
      <div className="lang-toggle-float">
        <button className={lang === 'id' ? 'selected' : ''} onClick={() => onLangChange('id')}>ID</button>
        <button className={lang === 'en' ? 'selected' : ''} onClick={() => onLangChange('en')}>EN</button>
      </div>
      <AuthScreen lang={lang} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
