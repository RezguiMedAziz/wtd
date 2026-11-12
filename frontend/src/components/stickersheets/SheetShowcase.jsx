import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useCustomization } from '../../context/CustomizationContext';
import { sheetService, SHEETS_PATH } from '../../services/sheetService';
import SheetFlat from './SheetFlat';

/** Eye-catching strip of the published sticker sheets, shown at the top of the design journey.
 *  Tapping a sheet selects it right here (tap again to unselect); "See in 3D" opens the full viewer. */
export default function SheetShowcase() {
  const { state, dispatch } = useCustomization();
  const reduce = useReducedMotion();
  const [sheets, setSheets] = useState(null);

  useEffect(() => {
    const ctl = new AbortController();
    sheetService.list({ signal: ctl.signal }).then(setSheets).catch(() => setSheets([]));
    return () => ctl.abort();
  }, []);

  if (!sheets?.length) return null; // nothing published (or still loading): stay out of the way

  const chosenId = state.sheet?.id;
  const toggle = (s) => dispatch({ type: 'setSheet', value: chosenId === s.id ? null : { id: s.id, name: s.name } });

  return (
    <section className="sticker-card mb-5 bg-brand-butter p-4 sm:p-5" aria-label="Sticker sheets">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Sparkles size={22} aria-hidden /> Start with a sticker sheet</h2>
          <p className="text-sm font-semibold text-brand-ink/70">
            {state.sheet ? <>Selected: <b>{state.sheet.name || 'your sheet'}</b> — its stickers will be ready on your case.</> : 'Pick a ready-made sheet — every sticker will be ready to place on your case.'}
          </p>
        </div>
        <Link to={SHEETS_PATH} className="btn-pop bg-brand-pink !px-4 !py-2 text-sm">See them in 3D <ArrowRight size={16} aria-hidden /></Link>
      </div>

      <ul className="flex gap-4 overflow-x-auto px-1 pb-3 pt-2">
        {sheets.map((s, i) => {
          const on = chosenId === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <motion.button
                type="button" onClick={() => toggle(s)} aria-pressed={on} aria-label={`${on ? 'Unselect' : 'Select'} ${s.name}`}
                animate={reduce ? undefined : { y: [0, -6, 0] }}
                transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className={`relative block rounded-3xl p-1.5 ${on ? 'bg-brand-yellow shadow-soft ring-4 ring-brand-pink/70' : 'bg-white/70'}`}
              >
                <SheetFlat sheet={s} className="w-28 sm:w-36" />
                {on && <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-brand-ink bg-brand-pink"><Check size={16} aria-hidden /></span>}
                <span className="mt-1 block max-w-[8.5rem] truncate text-center text-xs font-bold">{s.name}</span>
                <span className="block text-center text-[11px] font-semibold text-brand-ink/60">{s.stickerCount} sticker{s.stickerCount === 1 ? '' : 's'}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}