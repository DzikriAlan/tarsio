import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from './supabase';
import type { Language } from './types';

// Kode error Supabase (mis. 'email_provider_disabled') jauh lebih stabil
// daripada teks message-nya, jadi ikut diteruskan ke UI.
type AuthResult = { error: string | null; code?: string };

// Supabase Auth selalu butuh email, tapi tarsio cuma minta username. Username
// dipetakan ke email sintetis di domain yang tidak pernah dikirimi surat, jadi
// keunikan username ikut dijamin oleh unique constraint email milik Supabase.
const USERNAME_DOMAIN = 'tarsio.local';

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

type AuthState = {
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  signUp: (username: string, password: string, lang: Language) => Promise<AuthResult>;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (lang: Language) => Promise<AuthResult>;
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
        const prof = data as Profile;
        setProfile(prof);
        setLang(prof.language_pref as Language);

        // Akun Google baru selalu lahir dengan language_pref default. Kalau
        // tamu sempat memilih bahasa lain sebelum login, terapkan sekali.
        let storedLang: string | null = null;
        try {
          storedLang = window.localStorage.getItem('tarsio.langPref');
        } catch {
          storedLang = null;
        }
        if (
          (storedLang === 'id' || storedLang === 'en') &&
          storedLang !== prof.language_pref
        ) {
          setLang(storedLang);
          await supabase
            .from('profiles')
            .update({ language_pref: storedLang })
            .eq('id', session.user.id);
        }
        try {
          window.localStorage.removeItem('tarsio.langPref');
        } catch {
          // abaikan
        }
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

  async function signUp(username: string, password: string, lang: Language) {
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: { data: { display_name: username.trim(), language_pref: lang } },
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

  async function signIn(username: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) return { error: error.message, code: error.code };
    return { error: null };
  }

  // Google memakai email asli, jadi berbeda dari alur username → email sintetis.
  // Supabase yang meng-handle redirect OAuth; profil dibuat oleh trigger
  // handle_new_user dari metadata Google (nama + avatar). Bahasa akun baru
  // ikut preferensi tamu lewat localStorage, dibaca lagi setelah redirect.
  async function signInWithGoogle(lang: Language) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tarsio.langPref', lang);
      }
    } catch {
      // localStorage bisa diblokir (mode privat) — bukan alasan gagal login.
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) return { error: error.message, code: error.code };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, language, setLanguage, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
