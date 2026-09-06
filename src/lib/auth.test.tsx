import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createSupabaseMock, fakeProfile } from '@/test/supabaseMock';

// A live container the mocked module forwards every property access to, so we
// can swap the underlying client per test while keeping one stable import.
const store = vi.hoisted(() => ({ client: undefined as unknown as Record<string, unknown> }));

vi.mock('./supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: (_t, prop) => store.client?.[prop as string],
      has: (_t, prop) => prop in (store.client ?? {}),
    },
  ),
}));

// Imported after vi.mock so the provider picks up the mocked client.
const { AuthProvider, useAuth, usernameToEmail } = await import('./auth');

let mock: ReturnType<typeof createSupabaseMock>;

function mountAuth(session: unknown = undefined) {
  mock = createSupabaseMock({
    session,
    resolver: (ctx) => {
      if (ctx.table === 'profiles' && ctx.op === 'select') {
        return { data: [fakeProfile] };
      }
      return { data: [], error: null, count: 0 };
    },
  });
  store.client = mock.client as unknown as Record<string, unknown>;
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe('usernameToEmail', () => {
  it('maps a username to a synthetic tarsio.local email', () => {
    expect(usernameToEmail('Rama')).toBe('rama@tarsio.local');
  });

  it('trims surrounding whitespace and lowercases', () => {
    expect(usernameToEmail('  MixedCase  ')).toBe('mixedcase@tarsio.local');
  });
});

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});

describe('AuthProvider', () => {
  it('loads the session and profile on mount', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mock.auth.getSession).toHaveBeenCalled();
    expect(result.current.profile?.display_name).toBe('Rama Putra');
    expect(result.current.language).toBe('id');
  });

  it('stops loading immediately when there is no session', async () => {
    const { result } = mountAuth(null);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it('signUp sends a synthetic email plus display_name / language metadata', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { error: string | null } | undefined;
    await act(async () => {
      res = await result.current.signUp('  Bob ', 'secret123', 'en');
    });

    expect(res).toEqual({ error: null });
    expect(mock.auth.signUp).toHaveBeenCalledWith({
      email: 'bob@tarsio.local',
      password: 'secret123',
      options: { data: { display_name: 'Bob', language_pref: 'en' } },
    });
  });

  it('signUp passes the Supabase error message and code through', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Password is too weak', code: 'weak_password' },
    });

    let res: { error: string | null; code?: string } | undefined;
    await act(async () => {
      res = await result.current.signUp('bob', 'x', 'id');
    });

    expect(res).toEqual({ error: 'Password is too weak', code: 'weak_password' });
  });

  it('signIn calls signInWithPassword with the synthetic email', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('Rama', 'hunter2');
    });

    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'rama@tarsio.local',
      password: 'hunter2',
    });
  });

  it('signIn surfaces invalid-credential errors', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });

    let res: { error: string | null; code?: string } | undefined;
    await act(async () => {
      res = await result.current.signIn('rama', 'wrong');
    });

    expect(res).toEqual({
      error: 'Invalid login credentials',
      code: 'invalid_credentials',
    });
  });

  it('signInWithGoogle triggers the OAuth redirect and remembers the language', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { error: string | null } | undefined;
    await act(async () => {
      res = await result.current.signInWithGoogle('en');
    });

    expect(res).toEqual({ error: null });
    expect(mock.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = mock.auth.signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe('google');
    expect(arg.options.queryParams).toEqual({ prompt: 'select_account' });
    expect(window.localStorage.getItem('tarsio.langPref')).toBe('en');
  });

  it('signInWithGoogle returns the error when Supabase rejects the provider', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: null },
      error: { message: 'provider is not enabled', code: 'validation_failed' },
    });

    let res: { error: string | null; code?: string } | undefined;
    await act(async () => {
      res = await result.current.signInWithGoogle('id');
    });

    expect(res).toEqual({
      error: 'provider is not enabled',
      code: 'validation_failed',
    });
  });

  it('signOut clears the session and profile', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mock.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('setLanguage persists the choice to the profile row', async () => {
    const { result } = mountAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.fromCalls.length = 0;

    await act(async () => {
      await result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    const update = mock.fromCalls.find(
      (c) => c.table === 'profiles' && c.op === 'update',
    );
    expect(update?.payload).toEqual({ language_pref: 'en' });
  });

  it('applies a guest language choice stored before a Google redirect', async () => {
    window.localStorage.setItem('tarsio.langPref', 'en');
    const { result } = mountAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.language).toBe('en'));

    const update = mock.fromCalls.find(
      (c) => c.table === 'profiles' && c.op === 'update',
    );
    expect(update?.payload).toEqual({ language_pref: 'en' });
    expect(window.localStorage.getItem('tarsio.langPref')).toBeNull();
  });
});
