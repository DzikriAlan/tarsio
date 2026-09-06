import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createSupabaseMock,
  fakeProfile,
  type QueryContext,
  type QueryResolver,
} from '@/test/supabaseMock';

const store = vi.hoisted(() => ({ client: undefined as unknown as Record<string, unknown> }));
const authState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy({}, { get: (_t, p) => store.client?.[p as string] }),
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => authState.current }));

const { Dashboard } = await import('./Dashboard');

const quests = [
  {
    id: 'q1',
    category_id: 'c1',
    title_id: 'Petakan Kariermu',
    title_en: 'Map Your Career',
    description_id: 'Deskripsi id',
    description_en: 'Description en',
    tier_required: 'free',
    xp_reward: 50,
    sort_order: 1,
  },
  {
    id: 'q2',
    category_id: 'c2',
    title_id: 'Kenali Nilaimu',
    title_en: 'Know Your Values',
    description_id: 'Deskripsi id 2',
    description_en: 'Description en 2',
    tier_required: 'premium',
    xp_reward: 80,
    sort_order: 2,
  },
];
const categories = [
  { id: 'c1', slug: 'career', name_id: 'Karier', name_en: 'Career', icon: null, sort_order: 1 },
  { id: 'c2', slug: 'self_discovery', name_id: 'Jati Diri', name_en: 'Self-discovery', icon: null, sort_order: 2 },
];

const defaultResolver: QueryResolver = (ctx: QueryContext) => {
  switch (ctx.table) {
    case 'quest_categories':
      return { data: categories };
    case 'quests':
      return { data: quests };
    case 'quest_questions':
      return { data: [] };
    case 'quest_completions':
      return { data: [], count: 0 };
    case 'mood_logs':
      return ctx.head ? { count: 0 } : { data: [] };
    case 'chat_sessions':
      return { data: [{ id: 'sess-1' }] };
    case 'chat_messages':
      return { data: [] };
    case 'profiles':
      return { data: [fakeProfile] };
    default:
      return { data: [], count: 0 };
  }
};

let mock: ReturnType<typeof createSupabaseMock>;
const setLanguage = vi.fn();
const signOut = vi.fn();
const refreshProfile = vi.fn();

function mountDashboard(
  overrides: { profile?: Record<string, unknown>; resolver?: QueryResolver } = {},
) {
  mock = createSupabaseMock({
    resolver: overrides.resolver ?? defaultResolver,
  });
  store.client = mock.client as unknown as Record<string, unknown>;
  authState.current = {
    profile: overrides.profile ?? { ...fakeProfile },
    language: 'id',
    setLanguage,
    signOut,
    refreshProfile,
  };
  return render(<Dashboard />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  it('greets the user by first name and shows the daily XP goal', async () => {
    mountDashboard();
    expect(await screen.findByText(/Hai, Rama\./)).toBeInTheDocument();
    expect(screen.getByText('0 / 50 XP')).toBeInTheDocument();
  });

  it('renders the published quests from Supabase', async () => {
    mountDashboard();
    expect(await screen.findByText('Petakan Kariermu')).toBeInTheDocument();
    expect(screen.getByText('Kenali Nilaimu')).toBeInTheDocument();
  });

  it('marks a premium quest as locked for a free member', async () => {
    mountDashboard();
    const card = (await screen.findByText('Kenali Nilaimu')).closest('button')!;
    expect(within(card).getByText('Circle')).toBeInTheDocument();
    expect(card.className).toContain('is-locked');
  });

  it('switches to the Achievements view and lists every badge', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);
    await user.click(screen.getByRole('button', { name: /Lencana/ }));

    const grid = document.querySelector('.achievements-grid')!;
    expect(grid.querySelectorAll('.achievement-card')).toHaveLength(7);
  });

  it('shows the referral code (first 8 chars of the user id, upper-cased) in Friends', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);
    await user.click(screen.getByRole('button', { name: /Teman/ }));
    expect(screen.getByText('USER-1')).toBeInTheDocument();
  });

  it('copies the referral code to the clipboard', async () => {
    const user = userEvent.setup();
    // userEvent installs its own clipboard stub on setup(); spy after that.
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);
    await user.click(screen.getByRole('button', { name: /Teman/ }));
    await user.click(screen.getByRole('button', { name: /Salin/ }));
    expect(writeText).toHaveBeenCalledWith('USER-1');
  });

  it('shows the empty blueprint state when no quests are completed', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);
    await user.click(screen.getByRole('button', { name: /Blueprint/ }));
    expect(
      screen.getByText('Selesaikan misi pertamamu buat mulai bangun blueprint-mu.'),
    ).toBeInTheDocument();
  });

  it('changes language from the top bar', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(setLanguage).toHaveBeenCalledWith('en');
  });

  it('persists a daily vibe check-in to mood_logs', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);

    await user.click(screen.getByRole('button', { name: /Bersemangat/ }));

    await waitFor(() => {
      const upsert = mock.fromCalls.find(
        (c) => c.table === 'mood_logs' && c.op === 'upsert',
      );
      expect(upsert).toBeTruthy();
      expect((upsert!.payload as { mood: string }).mood).toBe('on_fire');
    });
  });

  it('opens the Tarsy chat drawer with a welcome message', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);

    await user.click(screen.getByRole('button', { name: /Ngobrol sama Tarsy/ }));

    expect(
      await screen.findByText('Hai, aku Tarsy. Apa yang lagi ngisi kepalamu hari ini?'),
    ).toBeInTheDocument();
  });

  it('opens the upgrade paywall from the sidebar CTA', async () => {
    const user = userEvent.setup();
    mountDashboard();
    await screen.findByText(/Hai, Rama\./);

    await user.click(screen.getByRole('button', { name: /Jelajahi/ }));
    expect(
      await screen.findByText('Lebih banyak ruang buat jadi dirimu.'),
    ).toBeInTheDocument();
  });

  it('hides the upgrade CTA for premium members', async () => {
    mountDashboard({ profile: { ...fakeProfile, subscription_tier: 'premium' } });
    await screen.findByText(/Hai, Rama\./);
    expect(screen.queryByRole('button', { name: /Jelajahi/ })).not.toBeInTheDocument();
  });
});
