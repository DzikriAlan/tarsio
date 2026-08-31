import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from './supabase';
import type { Language } from './types';

// Kode error Supabase (mis. 'email_provider_disabled') jauh lebih stabil
// daripada teks message-nya, jadi ikut diteruskan ke UI.
type AuthResult = { error: string | null; code?: string };

type AuthState = {
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  signUp: (email: string, password: string, displayName: string, lang: Language) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthState['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLang] = useState<Language>('id');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as AuthState['session']);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess as AuthState['session']);
      if (!sess) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled && !error && data) {
        setProfile(data as Profile);
        setLang((data as Profile).language_pref as Language);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function refreshProfile() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setLang((data as Profile).language_pref as Language);
    }
  }

  async function setLanguage(lang: Language) {
    setLang(lang);
    if (session?.user?.id) {
      await supabase.from('profiles').update({ language_pref: lang }).eq('id', session.user.id);
    }
  }

  async function signUp(email: string, password: string, displayName: string, lang: Language) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, language_pref: lang } },
    });
    if (error) return { error: error.message, code: error.code };
    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      if (prof) {
        setProfile(prof as Profile);
        setLang(lang);
      }
    }
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, code: error.code };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, language, setLanguage, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
