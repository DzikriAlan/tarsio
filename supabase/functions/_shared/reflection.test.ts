import { describe, it, expect } from 'vitest';
import {
  assertReflectionShape,
  buildPrompt,
  generateReflection,
  RESULT_SCHEMA,
  type Answer,
} from './reflection';

const answers: Answer[] = [
  { question: 'What drains you?', answer: 'worry' },
  { question: 'A recent win?', answer: 'I finished a hard project at work finally' },
];

describe('buildPrompt (quest-result)', () => {
  it('embeds the quest title and a numbered transcript', () => {
    const p = buildPrompt('Map Your Career', answers, 'en');
    expect(p).toContain('Map Your Career');
    expect(p).toContain('1. Q: What drains you?');
    expect(p).toContain('   A: worry');
    expect(p).toContain('2. Q: A recent win?');
  });

  it('uses the Indonesian persona for lang="id"', () => {
    expect(buildPrompt('Misi', answers, 'id')).toContain('teman refleksi diri');
  });

  it('uses the English persona for any non-id lang', () => {
    expect(buildPrompt('Quest', answers, 'en')).toContain('self-reflection companion');
  });

  it('never leaks that Tarsy is an AI', () => {
    const p = buildPrompt('Quest', answers, 'en');
    expect(p).toMatch(/Never mention that you are an AI/);
  });
});

describe('generateReflection (deterministic fallback)', () => {
  it('returns a title, body and takeaway', () => {
    const r = generateReflection('Quest', answers, 'en');
    expect(r.title).toBeTruthy();
    expect(r.body).toBeTruthy();
    expect(r.takeaway).toBeTruthy();
  });

  it('detects an overthinking pattern from keyword answers', () => {
    const r = generateReflection('Quest', [{ question: 'q', answer: 'overthinking' }], 'en');
    expect(r.title).toBe("Your Thoughts Are Not the Enemy, They're Signals");
    expect(r.body).toContain('racing thoughts');
  });

  it('detects money stress', () => {
    const r = generateReflection('Quest', [{ question: 'q', answer: 'stress' }], 'en');
    expect(r.title).toBe('Money Is Not a Mirror of Your Worth');
  });

  it('detects a low-boundary pattern', () => {
    const r = generateReflection('Quest', [{ question: 'q', answer: 'guilt' }], 'en');
    expect(r.title).toBe("Boundaries Aren't Walls, They're Bridges to Yourself");
  });

  it('quotes a long free-text answer back to the user', () => {
    const long = 'I keep saying yes to everyone and it is wearing me down';
    const r = generateReflection('Quest', [{ question: 'q', answer: long }], 'en');
    expect(r.body).toContain(long);
  });

  it('falls back to the generic reflection when no pattern matches', () => {
    const r = generateReflection('Quest', [{ question: 'q', answer: 'z' }], 'en');
    expect(r.title).toBe('Every Answer Is a Step Forward');
    expect(r.body).toContain('mirror');
  });

  it('localizes to Indonesian', () => {
    const r = generateReflection('Misi', [{ question: 'q', answer: 'overthinking' }], 'id');
    expect(r.title).toBe('Pikiranmu Bukan Musuh, Tapi Sinyal');
  });

  it('joins multiple body paragraphs with a blank line', () => {
    const r = generateReflection(
      'Quest',
      [
        { question: 'q1', answer: 'worry' }, // overthinking + money
        { question: 'q2', answer: 'guilt' }, // low boundary
      ],
      'en',
    );
    expect(r.body.split('\n\n').length).toBeGreaterThan(1);
  });
});

describe('assertReflectionShape', () => {
  it('trims and returns a valid payload', () => {
    expect(
      assertReflectionShape({ title: '  Hi  ', body: ' body ', takeaway: ' step ' }),
    ).toEqual({ title: 'Hi', body: 'body', takeaway: 'step' });
  });

  it('rejects a missing field', () => {
    expect(() => assertReflectionShape({ title: 'x', body: 'y' })).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() =>
      assertReflectionShape({ title: '   ', body: 'y', takeaway: 'z' }),
    ).toThrow();
  });

  it('rejects null', () => {
    expect(() => assertReflectionShape(null)).toThrow();
  });
});

describe('RESULT_SCHEMA', () => {
  it('requires the three reflection fields', () => {
    expect(RESULT_SCHEMA.required).toEqual(['title', 'body', 'takeaway']);
  });
});
