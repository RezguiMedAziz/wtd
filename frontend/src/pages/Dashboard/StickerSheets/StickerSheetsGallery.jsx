import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Box, Check, Loader2, Sparkles } from 'lucide-react';
import { ROUTES } from '../../../constants/routes';
import { useCustomization } from '../../../context/CustomizationContext';
import { canEnterStep } from '../../../controllers/customizationController';
import { sheetService } from '../../../services/sheetService';
import SheetFlat from '../../../components/stickersheets/SheetFlat';

export default function StickerSheetsGallery() {
  const { state, dispatch } = useCustomization();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [sheets, setSheets] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctl = new AbortController();
    sheetService.list({ signal: ctl.signal })
      .then(setSheets)
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, []);

  // Mid-design (phone + case already chosen) → back to the sticker step, otherwise start with the phone.
  const skip = () => {
    dispatch({ type: 'setSheet', value: null });
    dispatch({ type: 'go', step: canEnterStep(3, state) ? 3 : 1 });
    navigate(ROUTES.phonesCases);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-ink/70"><Sparkles size={16} aria-hidden /> Step 1 · Pick your stickers</p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          <span className="text-brand-pink [-webkit-text-stroke:2px_#141414]">Sticker</span>{' '}
          <span className="text-brand-blue [-webkit-text-stroke:2px_#141414]">Sheets</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-brand-ink/70">Browse all the sheets, then tap one to spin it around in 3D and zoom into every sticker.</p>
      </header>

      {!sheets && !error && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading sticker sheets…</p>}
      {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}

      {sheets && !sheets.length && (
        <div className="chalk-card p-8 text-center">
          <p className="font-bold">No sticker sheets are available yet.</p>
          <p className="text-sm text-brand-ink/70">You can still design a case with your own pictures.</p>
          <button type="button" onClick={skip} className="btn-pop mt-4 bg-brand-pink">Continue <ArrowRight size={18} aria-hidden /></button>
        </div>
      )}

      {sheets && sheets.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((s, i) => {
              const selected = state.sheet?.id === s.id;
              return (
                <motion.li
                  key={s.id}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(i * 0.05, 0.4) }}
                >
                  <Link
                    to={ROUTES.stickerSheet(s.id)}
                    aria-label={`${s.name}, ${s.stickerCount} stickers. View in 3D`}
                    className="sticker-card group relative flex h-full flex-col gap-3 bg-brand-butter p-4 transition-transform hover:-translate-y-1 focus-visible:-translate-y-1"
                  >
                    {selected && (
                      <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-yellow px-2.5 py-0.5 text-xs font-bold">
                        <Check size={14} aria-hidden /> Selected
                      </span>
                    )}
                    <SheetFlat sheet={s} className="w-full" />
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold leading-tight">{s.name}</h2>
                        <p className="text-sm font-bold text-brand-ink/60">{s.stickerCount} sticker{s.stickerCount === 1 ? '' : 's'}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-brand-ink bg-white px-3 py-1 text-xs font-bold transition-colors group-hover:bg-brand-pink">
                        <Box size={14} aria-hidden /> View in 3D
                      </span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>

          <p className="mt-8 text-center">
            <button type="button" onClick={skip} className="text-sm font-bold underline decoration-2 underline-offset-4">Skip — I’ll upload my own pictures</button>
          </p>
        </>
      )}
    </div>
  );
}