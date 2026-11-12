import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { CHARACTERS, WORLD } from '../../constants/characters';

const Row = ({ label, children }) => (children ? (
  <div className="rounded-2xl bg-brand-cream px-3 py-2">
    <dt className="text-xs font-bold uppercase tracking-wide text-brand-ink/50">{label}</dt>
    <dd className="text-sm font-medium leading-snug">{children}</dd>
  </div>
) : null);

/** Character information card (speech-bubble style). Rendered in a portal so page transforms never offset it. */
export default function CharacterCard({ id, onClose }) {
  const c = CHARACTERS[id];
  const reduce = useReducedMotion();
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`${c.name} — character card`}>
      <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-brand-ink/35" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border-[3px] border-brand-ink bg-white p-5 shadow-soft sm:p-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close card" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-[3px] border-brand-ink bg-brand-cream hover:bg-brand-yellow">
          <X size={18} aria-hidden />
        </button>
        <div className="flex items-center gap-4 pr-10">
          <img src={c.src} alt={`${c.name} the duck`} className="w-28 rounded-2xl border-[3px] border-brand-ink sm:w-32" style={{ boxShadow: `0 0 0 5px ${c.color}` }} />
          <div>
            <h2 className="text-3xl font-bold leading-none">{c.name}</h2>
            {c.human && <p className="mt-1 text-sm font-semibold text-brand-ink/60">human name: {c.human}</p>}
            <span className="mt-2 inline-block rounded-full border-[3px] border-brand-ink px-3 py-0.5 text-sm font-bold" style={{ background: c.color }}>{c.tagline}</span>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed">{c.story}</p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <Row label="Personality">{c.personality}</Row>
          <Row label="Age & job">{c.age && c.job ? `${c.age} · ${c.job}` : c.age || c.job}</Row>
          <Row label="Flaw">{c.flaw}</Row>
          <Row label="Role in the Metaverse">{c.role}</Row>
        </dl>
        {c.funny && <p className="mt-4 rounded-2xl border-[3px] border-dashed border-brand-ink/60 bg-brand-butter px-3 py-2 text-sm font-semibold">😄 Funny detail: {c.funny}</p>}
        <p className="mt-4 text-center text-xs font-semibold text-brand-ink/50">{WORLD.slogan}</p>
      </motion.div>
    </div>,
    document.body
  );
}
