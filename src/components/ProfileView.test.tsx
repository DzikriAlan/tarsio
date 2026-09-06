import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseMock, fakeProfile } from '@/test/supabaseMock';

const store = vi.hoisted(() => ({ client: undefined as unknown as Record<string, unknown> }));
const authState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy(
    {},
    { get: (_t, p) => store.client?.[p as string] },
  ),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => authState.current }));

const { ProfileView } = await import('./ProfileView');

let mock: ReturnType<typeof createSupabaseMock>;
const setLanguage = vi.fn();
const signOut = vi.fn();
const refreshProfile = vi.fn();

beforeEach(() => {
  mock = createSupabaseMock({ resolver: () => ({ data: [fakeProfile] }) });
  store.client = mock.client as unknown as Record<string, unknown>;
  authState.current = {
    profile: { ...fakeProfile },
    language: 'id',
    setLanguage,
    signOut,
    refreshProfile,
  };
});

describe('ProfileView', () => {
  it('renders the profile stats from the auth context', () => {
    const { container } = render(<ProfileView />);
    const stats = [...container.querySelectorAll('.profile-stat strong')].map(
      (el) => el.textContent,
    );
    // streak_count 4, xp_total 120, level 2 (getLevel(120)), longest_streak 9
    expect(stats).toEqual(['4', '120', '2', '9']);
  });

  it('shows the free tier label, and premium when upgraded', () => {
    const { rerender } = render(<ProfileView />);
    expect(screen.getByText('Penjelajah gratis')).toBeInTheDocument();

    authState.current = {
      ...authState.current,
      profile: { ...fakeProfile, subscription_tier: 'premium' },
    };
    rerender(<ProfileView />);
    expect(screen.getByText('Anggota Circle')).toBeInTheDocument();
  });

  it('saves an edited display name to the profiles row', async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    const input = screen.getByPlaceholderText('Nama tampilan');
    await user.clear(input);
    await user.type(input, 'Rama Baru');
    // The save control sits next to the name input.
    await user.click(input.parentElement!.querySelector('button')!);

    const update = mock.fromCalls.find(
      (c) => c.table === 'profiles' && c.op === 'update',
    );
    expect(update?.payload).toEqual({ display_name: 'Rama Baru' });
    expect(refreshProfile).toHaveBeenCalled();
    expect(await screen.findByText('Profil tersimpan!')).toBeInTheDocument();
  });

  it('switches language through the toggle', async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(setLanguage).toHaveBeenCalledWith('en');
  });

  it('signs out from the footer button', async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole('button', { name: 'Keluar' }));
    expect(signOut).toHaveBeenCalled();
  });

  it('deletes the account through the confirm modal', async () => {
    const user = userEvent.setup();
    render(<ProfileView />);
    await user.click(screen.getByRole('button', { name: /Hapus akun/ }));
    // Modal now open with its own delete button (full-button).
    const confirmButtons = screen.getAllByRole('button', { name: /Hapus akun/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    const del = mock.fromCalls.find(
      (c) => c.table === 'profiles' && c.op === 'delete',
    );
    expect(del).toBeTruthy();
    expect(mock.auth.signOut).toHaveBeenCalled();
  });
});
