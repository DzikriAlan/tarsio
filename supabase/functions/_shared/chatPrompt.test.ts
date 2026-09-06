import { describe, it, expect } from 'vitest';
import { buildPrompt, HISTORY_WINDOW, type Msg } from './chatPrompt';

describe('buildPrompt (tarsy-chat)', () => {
  it('appends the latest message under the English label with no history', () => {
    const p = buildPrompt([], 'I feel stuck', 'en');
    expect(p).toContain("User's latest message: I feel stuck");
    expect(p).not.toContain('---');
  });

  it('uses the Indonesian label and persona for lang="id"', () => {
    const p = buildPrompt([], 'aku cemas', 'id');
    expect(p).toContain('Pesan terbaru user: aku cemas');
    expect(p).toContain('teman ngobrol');
  });

  it('renders history as a fenced User/Tarsy transcript', () => {
    const history: Msg[] = [
      { role: 'user', content: 'hi' },
      { role: 'tarsy', content: 'hey there' },
    ];
    const p = buildPrompt(history, 'still here', 'en');
    expect(p).toContain('---\nUser: hi\nTarsy: hey there\n---');
    expect(p).toContain("User's latest message: still here");
  });

  it(`keeps only the last ${HISTORY_WINDOW} turns of history`, () => {
    const history: Msg[] = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'tarsy') as Msg['role'],
      content: `m${i}`,
    }));
    const p = buildPrompt(history, 'now', 'en');
    expect(p).not.toContain('m11');
    expect(p).toContain('m12');
    expect(p).toContain('m19');
    expect(p.match(/^(User|Tarsy): m\d+$/gm)).toHaveLength(HISTORY_WINDOW);
  });

  it('always includes the crisis-safety instruction', () => {
    expect(buildPrompt([], 'x', 'en')).toMatch(/self-harm/);
    expect(buildPrompt([], 'x', 'id')).toMatch(/menyakiti diri sendiri/);
  });

  it('instructs Tarsy not to reveal it is an AI', () => {
    expect(buildPrompt([], 'x', 'en')).toMatch(/Never mention that you are an AI/);
  });
});
