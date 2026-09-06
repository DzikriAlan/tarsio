import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders plain text unchanged', () => {
    const { container } = render(<Markdown text="just words" />);
    expect(container.textContent).toBe('just words');
  });

  it('renders **bold** as <strong>', () => {
    const { container } = render(<Markdown text="a **bold** word" />);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('bold');
  });

  it('renders *italic* and _italic_ as <em>', () => {
    const star = render(<Markdown text="an *emphatic* word" />);
    expect(star.container.querySelector('em')!.textContent).toBe('emphatic');

    const under = render(<Markdown text="an _emphatic_ word" />);
    expect(under.container.querySelector('em')!.textContent).toBe('emphatic');
  });

  it('renders `code` as <code>', () => {
    const { container } = render(<Markdown text="run `npm test` now" />);
    expect(container.querySelector('code')!.textContent).toBe('npm test');
  });

  it('turns newlines into <br> elements', () => {
    const { container } = render(<Markdown text={'line one\nline two'} />);
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.textContent).toContain('line one');
    expect(container.textContent).toContain('line two');
  });

  it('handles multiple inline spans in one line', () => {
    const { container } = render(
      <Markdown text="**bold** and *italic* and `code`" />,
    );
    expect(container.querySelector('strong')!.textContent).toBe('bold');
    expect(container.querySelector('em')!.textContent).toBe('italic');
    expect(container.querySelector('code')!.textContent).toBe('code');
  });

  it('leaves an unterminated marker as literal text', () => {
    const { container } = render(<Markdown text="a **dangling bold" />);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toBe('a **dangling bold');
  });

  it('renders an empty string without crashing', () => {
    const { container } = render(<Markdown text="" />);
    expect(container.textContent).toBe('');
  });
});
