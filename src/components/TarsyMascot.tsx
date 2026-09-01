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
        {/* Telinga bulat besar, duduk di belakang kepala */}
        <ellipse cx="28" cy="33" rx="19" ry="21" fill={FUR_SHADE} transform="rotate(-12 28 33)" />
        <ellipse cx="92" cy="33" rx="19" ry="21" fill={FUR_SHADE} transform="rotate(12 92 33)" />
        <ellipse cx="29" cy="35" rx="11" ry="13" fill={EAR_INNER} transform="rotate(-12 29 35)" />
        <ellipse cx="91" cy="35" rx="11" ry="13" fill={EAR_INNER} transform="rotate(12 91 35)" />

        {/* Kepala membulat, sedikit lebih lebar dari tinggi */}
        <ellipse cx="60" cy="69" rx="41" ry="38" fill={FUR} stroke={LINE} strokeWidth="1.4" strokeOpacity="0.45" />
        <ellipse cx="60" cy="72" rx="35" ry="32" fill={FACE} />

        {/* Mata besar berdekatan — ciri khas tarsius, tapi biru bukan amber */}
        {eyeShape === 'blink' ? (
          <>
            <path d="M 34 64 Q 46 72, 58 64" stroke={LINE} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 62 64 Q 74 72, 86 64" stroke={LINE} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : eyeShape === 'happy' ? (
          <>
            <path d="M 34 68 Q 46 52, 58 68" stroke={LINE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 62 68 Q 74 52, 86 68" stroke={LINE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="46" cy="65" r="13.5" fill="#ffffff" stroke={LINE} strokeWidth="1.2" />
            <circle cx="74" cy="65" r="13.5" fill="#ffffff" stroke={LINE} strokeWidth="1.2" />
            <circle cx={46 + gaze} cy="65" r="9.5" fill={IRIS} />
            <circle cx={74 + gaze} cy="65" r="9.5" fill={IRIS} />
            <circle cx={46 + gaze} cy="68" r="9.5" fill={IRIS_RIM} opacity="0.3" />
            <circle cx={74 + gaze} cy="68" r="9.5" fill={IRIS_RIM} opacity="0.3" />
            <circle cx={46 + gaze} cy="65" r="5" fill={PUPIL} />
            <circle cx={74 + gaze} cy="65" r="5" fill={PUPIL} />
            {/* Kilau mata */}
            <circle cx={42 + gaze} cy="60" r="3.6" fill="#fff" />
            <circle cx={70 + gaze} cy="60" r="3.6" fill="#fff" />
            <circle cx={50 + gaze} cy="70" r="2" fill="#fff" opacity="0.85" />
            <circle cx={78 + gaze} cy="70" r="2" fill="#fff" opacity="0.85" />
          </>
        )}

        {/* Hidung mungil */}
        <ellipse cx="60" cy="84" rx="4" ry="3.2" fill={NOSE} />

        {/* Mulut */}
        {mouthShape === 'open' ? (
          <>
            <ellipse cx="60" cy="93" rx="6" ry="5" fill={MOUTH} />
            <ellipse cx="60" cy="95" rx="3.2" ry="2.2" fill="#e79aa6" opacity="0.7" />
          </>
        ) : mouthShape === 'smile-big' ? (
          <path d="M 52 90 Q 60 99, 68 90" stroke={MOUTH} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'gentle' ? (
          <path d="M 54 90 Q 60 94, 66 90" stroke={MOUTH} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : mouthShape === 'small' ? (
          <ellipse cx="60" cy="91" rx="2.6" ry="2.2" fill={MOUTH} />
        ) : (
          <>
            <path d="M 54 89 Q 57 93, 60 89.5" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 60 89.5 Q 63 93, 66 89" stroke={MOUTH} strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Think bubbles when thinking */}
        {mood === 'think' && (
          <>
            <circle cx="104" cy="20" r="5" fill="#fff" stroke={LINE} strokeWidth="1.4" opacity="0.85" />
            <circle cx="113" cy="11" r="3" fill="#fff" stroke={LINE} strokeWidth="1.4" opacity="0.85" />
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
