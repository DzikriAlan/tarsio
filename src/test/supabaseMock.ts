import { vi } from 'vitest';

/**
 * Minimal stand-in for the Supabase JS client.
 *
 * The real client returns a thenable query builder whose methods
 * (`select`, `eq`, `order`, `insert`, ...) chain, and where `single()` /
 * `maybeSingle()` collapse the result to one row. This mock reproduces that
 * shape and delegates the actual `{ data, error, count }` payload to a
 * resolver you supply per test, keyed by table + operation.
 */

export type QueryContext = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  filters: Record<string, unknown>;
  payload?: unknown;
  head: boolean;
  count?: string;
  single: boolean;
};

export type TableResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

export type QueryResolver = (ctx: QueryContext) => TableResult;

const emptyResult: TableResult = { data: null, error: null, count: 0 };

function makeBuilder(table: string, resolver: QueryResolver, calls: QueryContext[]) {
  const ctx: QueryContext = {
    table,
    op: 'select',
    filters: {},
    head: false,
    single: false,
  };

  const resolve = (): TableResult => {
    calls.push({ ...ctx, filters: { ...ctx.filters } });
    const raw = resolver(ctx) ?? emptyResult;
    if (ctx.single) {
      const d = raw.data;
      const row = Array.isArray(d) ? (d[0] ?? null) : (d ?? null);
      return { data: row, error: raw.error ?? null, count: raw.count ?? null };
    }
    return {
      data: raw.data ?? (raw.error ? null : []),
      error: raw.error ?? null,
      count: raw.count ?? 0,
    };
  };

  const builder: Record<string, unknown> = {};

  const chain = (fn?: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      fn?.(...args);
      return builder;
    };

  Object.assign(builder, {
    select: chain((_cols, opts) => {
      const o = opts as { count?: string; head?: boolean } | undefined;
      if (o?.count) ctx.count = o.count;
      if (o?.head) ctx.head = true;
    }),
    insert: chain((payload) => {
      ctx.op = 'insert';
      ctx.payload = payload;
    }),
    update: chain((payload) => {
      ctx.op = 'update';
      ctx.payload = payload;
    }),
    upsert: chain((payload) => {
      ctx.op = 'upsert';
      ctx.payload = payload;
    }),
    delete: chain(() => {
      ctx.op = 'delete';
    }),
    eq: chain((col, val) => {
      ctx.filters[col as string] = val;
    }),
    neq: chain(),
    gt: chain(),
    gte: chain(),
    lt: chain(),
    lte: chain(),
    in: chain(),
    is: chain(),
    not: chain(),
    like: chain(),
    ilike: chain(),
    contains: chain(),
    filter: chain(),
    match: chain(),
    order: chain(),
    limit: chain(),
    range: chain(),
    single: () => Promise.resolve((ctx.single = true, resolve())),
    maybeSingle: () => Promise.resolve((ctx.single = true, resolve())),
    then: (
      onFulfilled: (v: TableResult) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).catch(onRejected),
  });

  return builder;
}

export type SupabaseMockOptions = {
  /** Resolves query payloads. Default: empty arrays / null rows. */
  resolver?: QueryResolver;
  /** Session returned by `auth.getSession()`. */
  session?: unknown;
};

export function createSupabaseMock(opts: SupabaseMockOptions = {}) {
  const resolver: QueryResolver = opts.resolver ?? (() => emptyResult);
  const fromCalls: QueryContext[] = [];
  const authListeners: Array<(event: string, session: unknown) => void> = [];

  const session =
    opts.session === undefined
      ? { user: { id: 'user-1', email: 'friend@tarsio.local' } }
      : opts.session;

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    getUser: vi
      .fn()
      .mockResolvedValue({ data: { user: (session as { user?: unknown })?.user ?? null }, error: null }),
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      authListeners.push(cb);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'friend@tarsio.local' }, session },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/auth' }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const client = {
    from: vi.fn((table: string) => makeBuilder(table, resolver, fromCalls)),
    auth,
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };

  return {
    client,
    auth,
    fromCalls,
    /** Fire the registered onAuthStateChange callbacks. */
    emitAuthState: (event: string, next: unknown) =>
      authListeners.forEach((cb) => cb(event, next)),
  };
}

/** A ready-made profile row for tests that just need a valid shape. */
export const fakeProfile = {
  id: 'user-1',
  display_name: 'Rama Putra',
  avatar_url: null,
  role: 'user' as const,
  language_pref: 'id' as const,
  subscription_tier: 'free' as const,
  streak_count: 4,
  longest_streak: 9,
  xp_total: 120, // getLevel(120) -> level 2
  last_checkin_at: null,
};
