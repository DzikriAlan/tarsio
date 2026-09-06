import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TarsyMascot } from './TarsyMascot';

describe('TarsyMascot', () => {
  it('renders an SVG face as a focusable button', () => {
    const { container } = render(<TarsyMascot lang="id" />);
    expect(container.querySelector('svg.tarsy-svg')).not.toBeNull();
    const root = screen.getByRole('button');
    expect(root).toHaveAttribute('tabindex', '0');
  });

  it('shows the idle speech bubble by default', () => {
    render(<TarsyMascot lang="id" mood="idle" />);
    expect(screen.getByText('Klik aku kalau mau ngobrol!')).toBeInTheDocument();
  });

  it('localizes the idle bubble', () => {
    render(<TarsyMascot lang="en" mood="idle" />);
    expect(screen.getByText('Click me if you want to chat!')).toBeInTheDocument();
  });

  it('hides the bubble when bubble={false}', () => {
    render(<TarsyMascot lang="id" mood="idle" bubble={false} />);
    expect(screen.queryByText('Klik aku kalau mau ngobrol!')).not.toBeInTheDocument();
  });

  it('only shows the bubble in the idle mood', () => {
    render(<TarsyMascot lang="id" mood="celebrate" />);
    expect(screen.queryByText('Klik aku kalau mau ngobrol!')).not.toBeInTheDocument();
  });

  it('fires onClick when tapped', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<TarsyMascot lang="id" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the size prop to the wrapper and svg', () => {
    const { container } = render(<TarsyMascot lang="id" size={80} />);
    const root = container.querySelector('.tarsy-mascot') as HTMLElement;
    expect(root.style.width).toBe('80px');
    expect(root.style.height).toBe('80px');
  });

  it('reflects the mood in the wrapper class', () => {
    const { container } = render(<TarsyMascot lang="id" mood="think" />);
    expect(container.querySelector('.tarsy-mascot')!.className).toContain('mood-think');
  });
});
