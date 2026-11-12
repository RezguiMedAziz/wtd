import { memo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CHARACTERS } from '../../constants/characters';
import SpeechBubble from './SpeechBubble';
import CharacterCard from './CharacterCard';

/**
 * A duck: its original illustration, completely still. Clicking opens the character card.
 * Only the highlight ring reacts — the artwork itself never moves, scales or gets cropped.
 */
function Duck({ name, size = 120, delay = 0, bubble, bubbleSide = 'top', showName = false, className = '', style }) {
  const c = CHARACTERS[name];
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const width = typeof size === 'number' ? `${size}px` : size;

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      style={{ width, ...style }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.4, delay }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Meet ${c.name}, ${c.tagline.toLowerCase()}`}
        className="group block w-full cursor-pointer rounded-[1.4rem] border-[3px] border-brand-ink bg-white p-0 transition-shadow duration-200 hover:shadow-[0_0_0_5px_var(--duck)] focus-visible:shadow-[0_0_0_5px_var(--duck)] active:shadow-[0_0_0_8px_var(--duck)]"
        style={{ '--duck': c.color, boxShadow: open ? `0 0 0 6px ${c.color}` : undefined }}
      >
        <img src={c.src} alt="" draggable={false} decoding="async" className="block h-auto w-full rounded-[1.1rem]" />
      </button>
      {showName && <span className="mt-1 block text-center text-sm font-bold">{c.name}</span>}
      {bubble && <SpeechBubble side={bubbleSide}>{bubble}</SpeechBubble>}
      <AnimatePresence>{open && <CharacterCard id={name} onClose={() => setOpen(false)} />}</AnimatePresence>
    </motion.div>
  );
}

export default memo(Duck);
