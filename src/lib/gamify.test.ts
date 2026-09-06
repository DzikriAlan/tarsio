import { describe, it, expect } from 'vitest';
import { achievements, getLevel, formatIDR } from './gamify';

describe('getLevel', () => {
  it('starts everyone at level 1 with 0 XP', () => {
    const r = getLevel(0);
    expect(r.level).toBe(1);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(50);
    expect(r.progress).toBe(0);
  });

  it('stays level 1 just below the first threshold', () => {
    expect(getLevel(49).level).toBe(1);
  });

  it('advances to level 2 exactly at the threshold', () => {
    const r = getLevel(50);
    expect(r.level).toBe(2);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(100); // 150 - 50
  });

  it('reports partial progress inside a level band', () => {
    const r = getLevel(100); // level 2 band is [50, 150)
    expect(r.level).toBe(2);
    expect(r.current).toBe(50);
    expect(r.needed).toBe(100);
    expect(r.progress).toBe(50);
  });

  it('caps out at level 10 for the last defined threshold', () => {
    expect(getLevel(3000).level).toBe(10);
  });

  it('clamps progress to 100 when XP overshoots the final threshold', () => {
    const r = getLevel(999999);
    expect(r.level).toBe(10);
    expect(r.progress).toBe(100);
    expect(r.needed).toBe(500); // synthetic band past the table
  });

  it('never returns progress above 100 or below 0', () => {
    for (const xp of [0, 25, 50, 149, 150, 800, 2999, 5000]) {
      const { progress } = getLevel(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    }
  });
});

describe('formatIDR', () => {
  it('formats an integer as Rupiah with no decimals', () => {
    const out = formatIDR(29000);
    expect(out).toMatch(/29\.000/);
    expect(out).toMatch(/Rp/);
  });

  it('formats zero', () => {
    expect(formatIDR(0)).toMatch(/Rp/);
    expect(formatIDR(0)).toMatch(/0/);
  });

  it('shows no decimal part for whole-Rupiah amounts', () => {
    expect(formatIDR(199000)).not.toMatch(/[.,]\d{2}$/);
  });

  it('groups thousands with a dot (id-ID locale)', () => {
    expect(formatIDR(1250000)).toMatch(/1\.250\.000/);
  });
});

describe('achievements', () => {
  const zero = { xp: 0, streak: 0, questsCompleted: 0, moodDays: 0 };

  it('unlocks nothing at a zero profile', () => {
    expect(achievements.filter((a) => a.check(zero))).toHaveLength(0);
  });

  it('unlocks "first_steps" after one quest', () => {
    const a = achievements.find((x) => x.id === 'first_steps')!;
    expect(a.check({ ...zero, questsCompleted: 1 })).toBe(true);
    expect(a.check(zero)).toBe(false);
  });

  it('unlocks streak badges at 3 and 7 days', () => {
    const s3 = achievements.find((x) => x.id === 'streak3')!;
    const s7 = achievements.find((x) => x.id === 'streak7')!;
    expect(s3.check({ ...zero, streak: 3 })).toBe(true);
    expect(s7.check({ ...zero, streak: 6 })).toBe(false);
    expect(s7.check({ ...zero, streak: 7 })).toBe(true);
  });

  it('unlocks XP badges at 100 and 500', () => {
    const x100 = achievements.find((x) => x.id === 'xp100')!;
    const x500 = achievements.find((x) => x.id === 'xp500')!;
    expect(x100.check({ ...zero, xp: 100 })).toBe(true);
    expect(x500.check({ ...zero, xp: 499 })).toBe(false);
    expect(x500.check({ ...zero, xp: 500 })).toBe(true);
  });

  it('unlocks "quests5" and "mood_master" at their thresholds', () => {
    const q5 = achievements.find((x) => x.id === 'quests5')!;
    const mm = achievements.find((x) => x.id === 'mood_master')!;
    expect(q5.check({ ...zero, questsCompleted: 5 })).toBe(true);
    expect(mm.check({ ...zero, moodDays: 7 })).toBe(true);
  });

  it('unlocks every badge for a maxed-out profile', () => {
    const maxed = { xp: 5000, streak: 30, questsCompleted: 20, moodDays: 30 };
    expect(achievements.filter((a) => a.check(maxed))).toHaveLength(achievements.length);
  });

  it('gives every achievement a stable id and translation keys', () => {
    const ids = new Set(achievements.map((a) => a.id));
    expect(ids.size).toBe(achievements.length);
    for (const a of achievements) {
      expect(a.nameKey.startsWith('gamify.')).toBe(true);
      expect(a.descKey.startsWith('gamify.')).toBe(true);
      expect(typeof a.icon).toBe('string');
    }
  });
});
