import { useState, useEffect } from 'react';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

export type TarsyMood = 'idle' | 'happy' | 'celebrate' | 'think' | 'encourage';

/* Palet coklat hangat dengan mata biru. Coklatnya aman dari kesan lebah
   selama iris tetap biru — yang dulu bikin terbaca sebagai lebah adalah
   mata amber plus outline nyaris hitam, bukan warna bulunya. */
const FUR = '#8d6647';
const FUR_SHADE = '#6b4830';
const EAR_INNER = '#c08a6d';
const FACE = '#a87a58';
const LINE = '#402a1c';
const IRIS = '#2f4ab5';
const IRIS_RIM = '#17246b';
const PUPIL = '#0d1024';
const NOSE = '#553321';
const MOUTH = '#3a2416';

export function TarsyMascot({ size = 120, mood = 'idle', lang, onClick, bubble = true, bubbleAlign = 'center' }: {
  size?: number;
  mood?: TarsyMood;
  lang: Language;
  onClick?: () => void;
  /** Speech bubble is opt-out: hide it inside tight containers that clip overflow. */
  bubble?: boolean;
  bubbleAlign?: 'center' | 'right' | 'left';
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
  // Pupils drift toward the thinking bubbles so the stare feels alive.
  const gaze = mood === 'think' ? 2.5 : 0;

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
        {/* Head tufts - wispy tarsier crown */}
        <path d="M 44 26 Q 46 12, 54 20" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 60 22 Q 60 8, 66 16" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 74 26 Q 78 14, 82 24" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Ears - small, round, thin-skinned. Tarsiers do NOT have long ears. */}
        <ellipse cx="19" cy="50" rx="10" ry="13" fill="#c99f78" stroke="#2b1810" strokeWidth="1.5" transform="rotate(-22 19 50)" />
        <ellipse cx="101" cy="50" rx="10" ry="13" fill="#c99f78" stroke="#2b1810" strokeWidth="1.5" transform="rotate(22 101 50)" />
        <path d="M 19 43 Q 23 50, 19 57" stroke="#8b6f52" strokeWidth="1.5" fill="none" transform="rotate(-22 19 50)" />
        <path d="M 101 43 Q 97 50, 101 57" stroke="#8b6f52" strokeWidth="1.5" fill="none" transform="rotate(22 101 50)" />

        {/* Long clinging fingers, tucked behind the head like a branch grip */}
        <g stroke="#2b1810" strokeWidth="1.5" fill="#c99f78">
          <ellipse cx="22" cy="86" rx="3.2" ry="10" transform="rotate(-14 22 86)" />
          <ellipse cx="30" cy="88" rx="3.2" ry="10.5" transform="rotate(-6 30 88)" />
          <ellipse cx="90" cy="88" rx="3.2" ry="10.5" transform="rotate(6 90 88)" />
          <ellipse cx="98" cy="86" rx="3.2" ry="10" transform="rotate(14 98 86)" />
        </g>

        {/* Head - round, slightly wider than tall */}
        <ellipse cx="60" cy="62" rx="39" ry="37" fill="#bc8f67" stroke="#2b1810" strokeWidth="1.5" />
        {/* Cream face mask */}
        <ellipse cx="60" cy="64" rx="33" ry="31" fill="#f0dcc4" />

        {/* THE signature: enormous eyes that nearly meet in the middle */}
        {eyeShape === 'blink' ? (
          <>
            <path d="M 26 58 Q 42 66, 58 58" stroke="#2b1810" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 62 58 Q 78 66, 94 58" stroke="#2b1810" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        ) : eyeShape === 'happy' ? (
          <>
            <path d="M 27 62 Q 42 44, 57 62" stroke="#2b1810" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 63 62 Q 78 44, 93 62" stroke="#2b1810" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Amber iris fills almost the whole eye - the tarsier stare */}
            <circle cx="42" cy="58" r="17" fill="#f0b73f" stroke="#2b1810" strokeWidth="2" />
            <circle cx="78" cy="58" r="17" fill="#f0b73f" stroke="#2b1810" strokeWidth="2" />
            <circle cx="42" cy="58" r="12" fill="#c98b1e" opacity="0.45" />
            <circle cx="78" cy="58" r="12" fill="#c98b1e" opacity="0.45" />
            {/* Wide dark pupils */}
            <circle cx={42 + gaze} cy="58" r="9.5" fill="#1a1a2e" />
            <circle cx={78 + gaze} cy="58" r="9.5" fill="#1a1a2e" />
            {/* Catchlights */}
            <circle cx={46 + gaze} cy="53" r="3.4" fill="#fff" />
            <circle cx={82 + gaze} cy="53" r="3.4" fill="#fff" />
            <circle cx={38 + gaze} cy="62" r="1.8" fill="#fff" opacity="0.7" />
            <circle cx={74 + gaze} cy="62" r="1.8" fill="#fff" opacity="0.7" />
          </>
        )}

        {/* Short muzzle tucked under the eyes */}
        <ellipse cx="60" cy="83" rx="13" ry="9" fill="#e3caae" />
        <path d="M 60 78 L 56.5 82 Q 60 85, 63.5 82 Z" fill="#2b1810" />

        {/* Mouth */}
        {mouthShape === 'open' ? (
          <>
            <ellipse cx="60" cy="89" rx="6.5" ry="5.5" fill="#2b1810" />
            <ellipse cx="60" cy="91" rx="3.5" ry="2.5" fill="#ff8fa3" opacity="0.6" />
          </>
        ) : mouthShape === 'smile-big' ? (
          <path d="M 52 85 Q 60 94, 68 85" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'gentle' ? (
          <path d="M 54 86 Q 60 90, 66 86" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'small' ? (
          <ellipse cx="60" cy="88" rx="3" ry="2.5" fill="#2b1810" />
        ) : (
          <path d="M 55 86 Q 60 89.5, 65 86" stroke="#2b1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* Blush, kept clear of the eyes */}
        <circle cx="34" cy="80" r="5" fill="#ff8fa3" opacity="0.4" />
        <circle cx="86" cy="80" r="5" fill="#ff8fa3" opacity="0.4" />

        {/* Think bubbles when thinking */}
        {mood === 'think' && (
          <>
            <circle cx="103" cy="24" r="5" fill="#fff" stroke="#2b1810" strokeWidth="1.5" opacity="0.8" />
            <circle cx="112" cy="14" r="3" fill="#fff" stroke="#2b1810" strokeWidth="1.5" opacity="0.8" />
          </>
        )}
      </svg>
      {bubble && mood === 'idle' && (
        <div className={`tarsy-speech-bubble align-${bubbleAlign}`}>
          {translate(lang, 'tarsy.idle')}
        </div>
      )}
    </div>
  );
}
