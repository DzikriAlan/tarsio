import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from './AuthScreen';

const auth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
};

vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));

beforeEach(() => {
  auth.signIn.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ error: null });
  auth.signInWithGoogle.mockResolvedValue({ error: null });
});

describe('AuthScreen', () => {
  it('renders the localized welcome copy', () => {
    render(<AuthScreen lang="id" />);
    expect(screen.getByRole('heading', { name: 'Selamat datang di Tarsio' })).toBeInTheDocument();
  });

  it('renders in English when lang="en"', () => {
    render(<AuthScreen lang="en" />);
    expect(screen.getByRole('heading', { name: 'Welcome to Tarsio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign up/ })).toBeInTheDocument();
  });

  it('defaults to sign-up mode and can toggle to log-in', async () => {
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    expect(screen.getByRole('button', { name: /^Sign up/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Already have an account/ }));
    expect(screen.getByRole('button', { name: /^Log in/ })).toBeInTheDocument();
  });

  it('strips whitespace typed into the username field', async () => {
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    const username = screen.getByPlaceholderText('Username') as HTMLInputElement;
    await user.type(username, 'ra ma bo');
    expect(username.value).toBe('ramabo');
  });

  it('submits sign-up with username, password and language', async () => {
    const user = userEvent.setup();
    render(<AuthScreen lang="id" />);
    await user.type(screen.getByPlaceholderText('Username'), 'ramaputra');
    await user.type(screen.getByPlaceholderText('Kata sandi'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^Daftar/ }));

    expect(auth.signUp).toHaveBeenCalledWith('ramaputra', 'secret123', 'id');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('submits log-in with just username and password after toggling', async () => {
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.click(screen.getByRole('button', { name: /Already have an account/ }));
    await user.type(screen.getByPlaceholderText('Username'), 'ramaputra');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^Log in/ }));

    expect(auth.signIn).toHaveBeenCalledWith('ramaputra', 'secret123');
  });

  it('maps a weak_password error code to the friendly message', async () => {
    auth.signUp.mockResolvedValueOnce({ error: 'raw', code: 'weak_password' });
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.type(screen.getByPlaceholderText('Username'), 'ramaputra');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^Sign up/ }));

    expect(await screen.findByText('Password must be at least 6 characters.')).toBeInTheDocument();
  });

  it('maps user_already_exists to the taken-username message', async () => {
    auth.signUp.mockResolvedValueOnce({ error: 'raw', code: 'user_already_exists' });
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.type(screen.getByPlaceholderText('Username'), 'ramaputra');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^Sign up/ }));

    expect(await screen.findByText('That username is taken. Try another one.')).toBeInTheDocument();
  });

  it('shows the raw error text for an unrecognized error', async () => {
    auth.signIn.mockResolvedValueOnce({ error: 'Server exploded', code: 'weird' });
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.click(screen.getByRole('button', { name: /Already have an account/ }));
    await user.type(screen.getByPlaceholderText('Username'), 'ramaputra');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^Log in/ }));

    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });

  it('starts Google sign-in with the current language', async () => {
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(auth.signInWithGoogle).toHaveBeenCalledWith('en');
  });

  it('shows a Google-specific error when the provider call fails', async () => {
    auth.signInWithGoogle.mockResolvedValueOnce({ error: 'nope' });
    const user = userEvent.setup();
    render(<AuthScreen lang="en" />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByText('Google sign-in failed. Please try again.')).toBeInTheDocument();
  });
});
