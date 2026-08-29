import type { ReactNode } from 'react';

// Tarsy hanya memakai markdown inline (bold / italic / code) — prompt-nya
// melarang bullet dan heading, jadi renderer kecil ini cukup dan tetap aman
// karena hasilnya React node, bukan innerHTML.
const PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

function renderLine(line: string, keyPrefix: string): ReactNode[] {
  return line.split(PATTERN).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <span key={key}>{part}</span>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {renderLine(line, String(i))}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}
