import { useState, useEffect } from 'react';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

export type TarsyMood = 'idle' | 'happy' | 'celebrate' | 'think' | 'encourage';

export function TarsyMascot({ size = 120, mood = 'idle', lang, onClick }: {
  size?: number;
  mood?: TarsyMood;
  lang: Language;
  onClick?: () => void;
}) {
  const [blink, setBlink] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (mood === 'celebrate' || mood === 'happy') {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(t);
    }
  }, [mood]);

  useEffect(() => {
    if (mood === 'think') {
      setWiggle(true);
      const t = setTimeout(() => setWiggle(false), 1500);
      return () => clearTimeout(t);
    }
  }, [mood]);

  const eyeShape = mood === 'celebrate' ? 'happy' : blink ? 'blink' : 'normal';
  const mouthShape = mood === 'celebrate' ? 'open' : mood === 'happy' ? 'smile-big' : mood === 'encourage' ? 'gentle' : mood === 'think' ? 'small' : 'smile';

  return (
    <div
      className={`tarsy-mascot ${bounce ? 'bounce' : ''} ${wiggle ? 'wiggle' : ''} mood-${mood}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="tarsy-aura" />
      <svg viewBox="0 0 120 120" className="tarsy-svg" style={{ width: size, height: size }}>
        {/* Big tarsier ears - signature feature */}
        <ellipse cx="28" cy="22" rx="16" ry="20" fill="#8b6f52" stroke="#2b1810" strokeWidth="1.5" transform="rotate(-18 28 22)" />
        <ellipse cx="92" cy="22" rx="16" ry="20" fill="#8b6f52" stroke="#2b1810" strokeWidth="1.5" transform="rotate(18 92 22)" />
        <ellipse cx="28" cy="24" rx="8" ry="11" fill="#d4a876" transform="rotate(-18 28 24)" />
        <ellipse cx="92" cy="24" rx="8" ry="11" fill="#d4a876" transform="rotate(18 92 24)" />

        {/* Head - rounded */}
        <ellipse cx="60" cy="62" rx="40" ry="38" fill="#bc8f67" stroke="#2b1810" strokeWidth="1.5" />
        {/* Face mask - lighter area */}
        <ellipse cx="60" cy="66" rx="34" ry="30" fill="#d4a876" opacity="0.5" />

        {/* Tarsier signature: huge eyes */}
        {eyeShape === 'blink' ? (
          <>
            <line x1="40" y1="58" x2="50" y2="58" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="70" y1="58" x2="80" y2="58" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : eyeShape === 'happy' ? (
          <>
            <path d="M 38 58 Q 45 48, 52 58" stroke="#1a1a2e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 68 58 Q 75 48, 82 58" stroke="#1a1a2e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Huge eye whites */}
            <ellipse cx="46" cy="58" rx="11" ry="12" fill="#fff" stroke="#2b1810" strokeWidth="1.5" />
            <ellipse cx="74" cy="58" rx="11" ry="12" fill="#fff" stroke="#2b1810" strokeWidth="1.5" />
            {/* Big dark pupils - tarsier signature */}
            <ellipse cx="46" cy="59" rx="8" ry="9" fill="#1a1a2e" />
            <ellipse cx="74" cy="59" rx="8" ry="9" fill="#1a1a2e" />
            {/* Eye shine */}
            <circle cx="49" cy="55" r="3" fill="#fff" />
            <circle cx="77" cy="55" r="3" fill="#fff" />
            <circle cx="43" cy="62" r="1.5" fill="#fff" opacity="0.6" />
            <circle cx="71" cy="62" r="1.5" fill="#fff" opacity="0.6" />
          </>
        )}

        {/* Small nose */}
        <ellipse cx="60" cy="74" rx="3.5" ry="2.5" fill="#8b6f52" stroke="#2b1810" strokeWidth="1" />

        {/* Mouth */}
        {mouthShape === 'open' ? (
          <>
            <ellipse cx="60" cy="82" rx="9" ry="7" fill="#1a1a2e" stroke="#2b1810" strokeWidth="1.5" />
            <ellipse cx="60" cy="85" rx="5" ry="3" fill="#ff8fa3" opacity="0.5" />
          </>
        ) : mouthShape === 'smile-big' ? (
          <path d="M 46 78 Q 60 92, 74 78" stroke="#1a1a2e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'gentle' ? (
          <path d="M 50 80 Q 60 85, 70 80" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'small' ? (
          <ellipse cx="60" cy="81" rx="4" ry="3" fill="#1a1a2e" />
        ) : (
          <path d="M 52 79 Q 60 84, 68 79" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}

        {/* Cheeks - blush */}
        <circle cx="34" cy="74" r="6" fill="#ff8fa3" opacity="0.45" />
        <circle cx="86" cy="74" r="6" fill="#ff8fa3" opacity="0.45" />

        {/* Think bubbles when thinking */}
        {mood === 'think' && (
          <>
            <circle cx="100" cy="30" r="5" fill="#fff" stroke="#2b1810" strokeWidth="1.5" opacity="0.7" />
            <circle cx="108" cy="20" r="3" fill="#fff" stroke="#2b1810" strokeWidth="1.5" opacity="0.7" />
          </>
        )}
      </svg>
      {mood === 'idle' && (
        <div className="tarsy-speech-bubble">
          {translate(lang, 'tarsy.idle')}
        </div>
      )}
    </div>
  );
}
