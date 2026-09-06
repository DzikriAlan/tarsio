import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@/lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState.current,
}));
vi.mock('@/components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard" />,
}));
vi.mock('@/components/AuthScreen', () => ({
  AuthScreen: ({ lang }: { lang: string }) => (
    <div data-testid="auth-screen">lang:{lang}</div>
  ),
}));

const { default: App } = await import('./App');

beforeEach(() => {
  authState.current = {
    session: null,
    profile: null,
    loading: false,
    language: 'id',
    setLanguage: vi.fn(),
  };
});

describe('App routing', () => {
  it('shows the loading screen while auth is resolving', () => {
    authState.current = { ...authState.current, loading: true };
    render(<App />);
    expect(screen.getByText('Tunggu sebentar...')).toBeInTheDocument();
  });

  it('shows the auth screen when there is no session', () => {
    render(<App />);
    expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('lets a guest switch the auth-screen language before signing in', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('auth-screen')).toHaveTextContent('lang:id');
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByTestId('auth-screen')).toHaveTextContent('lang:en');
  });

  it('renders the dashboard once a session and profile exist', () => {
    authState.current = {
      ...authState.current,
      session: { user: { id: 'user-1', email: 'x@tarsio.local' } },
      profile: { id: 'user-1', display_name: 'Rama' },
    };
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('falls back to the auth screen when a session exists but the profile is missing', () => {
    authState.current = {
      ...authState.current,
      session: { user: { id: 'user-1', email: 'x@tarsio.local' } },
      profile: null,
    };
    render(<App />);
    expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
  });
});
