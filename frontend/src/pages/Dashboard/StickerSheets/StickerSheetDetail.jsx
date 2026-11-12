import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { ROUTES } from '../../../constants/routes';
import { useCustomization } from '../../../context/CustomizationContext';
import { canEnterStep } from '../../../controllers/customizationController';
import { useSheet } from '../../../services/sheetService';
import SheetViewer3D from '../../../components/stickersheets/SheetViewer3D';
import { CHECKER } from '../../../components/stickersheets/sheetUtils';

export default function StickerSheetDetail() {
  const { id } = useParams();
  const { state, dispatch } = useCustomization();
  const navigate = useNavigate();
  const viewer = useRef(null);
  const [focusId, setFocusId] = useState(null);

  // Fetches exactly the sheet in the URL (GET /api/sheets/:id).
  const { sheet, loading, error } = useSheet(id);

  // While the next sheet loads, the hook still holds the previous one: only show a sheet that matches the URL.
  const active = sheet && String(sheet.id) === String(id) ? sheet : null;
  const selected = !!active && state.sheet?.id === active.id;

  // A different sheet in the URL → drop the sticker focus of the previous one.
  useEffect(() => { setFocusId(null); }, [id]);

  // Mid-design (phone + case already chosen) → back to the sticker step, otherwise start with the phone.
  const proceed = () => {
    dispatch({ type: 'go', step: canEnterStep(3, state) ? 3 : 1 });
    navigate(ROUTES.phonesCases);
  };
  const choose = (s) => {
    dispatch({ type: 'setSheet', value: { id: s.id, name: s.name } });
    proceed();
  };
  const skip = () => {
    dispatch({ type: 'setSheet', value: null });
    proceed();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <Link to={ROUTES.stickerSheets} className="btn-pop mb-3 inline-flex bg-white !px-3 !py-1.5 text-sm">
          <ArrowLeft size={16} aria-hidden /> All sheets
        </Link>
        <p className="flex items-center gap-2 text-sm font-bold text-brand-ink/70"><Sparkles size={16} aria-hidden /> Step 1 · Pick your stickers</p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          <span className="text-brand-pink [-webkit-text-stroke:2px_#141414]">Sticker</span>{' '}
          <span className="text-brand-blue [-webkit-text-stroke:2px_#141414]">Sheets</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-brand-ink/70">Spin the sheet around, zoom into the stickers you love, then pick it. Every sticker will be ready to place on your case on its own.</p>
      </header>

      {loading && !active && !error && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading sticker sheet…</p>}
      {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}

      {active && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr),minmax(0,1fr)]">
          <section className="sticker-card overflow-hidden p-0" aria-label={`3D preview of ${active.name}`}>
            <div className="relative bg-black">
              <SheetViewer3D key={active.id} ref={viewer} sheet={active} onFocusSticker={setFocusId} className="h-[26rem] sm:h-[34rem] lg:h-[40rem]" />
              <div className="absolute right-3 top-3 flex gap-2">
                <button type="button" onClick={() => viewer.current?.flip()} className="btn-pop bg-white !px-3 !py-1.5 text-sm"><RefreshCw size={15} aria-hidden /> Front / back</button>
                <button type="button" onClick={() => { viewer.current?.reset(); setFocusId(null); }} className="btn-pop bg-white !px-3 !py-1.5 text-sm"><RotateCcw size={15} aria-hidden /> Reset</button>
              </div>
              <p className="pointer-events-none absolute left-0 right-0 top-3 mx-auto w-fit max-w-[60%] rounded-full bg-white/80 px-3 py-1 text-center text-[11px] font-bold sm:text-xs">
                Drag to rotate · scroll or pinch to zoom · double-click a sticker to zoom in
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-5">
            <AnimatePresence mode="wait">
              <motion.section key={active.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="sticker-card bg-brand-butter p-5" aria-label="Selected sticker sheet">
                <h2 className="text-3xl font-bold leading-tight">{active.name}</h2>
                <p className="mt-0.5 text-sm font-bold text-brand-ink/60">{active.stickerCount} sticker{active.stickerCount === 1 ? '' : 's'}</p>
                {active.description && <p className="mt-2 text-sm font-medium leading-snug">{active.description}</p>}
                <button type="button" onClick={() => choose(active)} className="btn-pop mt-4 w-full bg-brand-pink py-3 text-lg">
                  {selected ? <Check size={20} aria-hidden /> : <ArrowRight size={20} aria-hidden />} {selected ? 'Continue with this sheet' : 'Use this sheet'}
                </button>
                <button type="button" onClick={skip} className="mt-2 w-full text-center text-sm font-bold underline decoration-2 underline-offset-4">Skip — I’ll upload my own pictures</button>
              </motion.section>
            </AnimatePresence>

            <section className="sticker-card p-4" aria-label="Stickers in this sheet">
              <h3 className="mb-2 text-lg font-bold">Inspect a sticker</h3>
              <ul className="grid max-h-60 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {active.stickers.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => { viewer.current?.focus(s.id); setFocusId(s.id); }} title={`Zoom to ${s.name}`} aria-label={`Zoom to ${s.name}`}
                      className={`grid aspect-square w-full place-items-center rounded-xl border-[3px] border-brand-ink p-1 hover:-translate-y-0.5 ${focusId === s.id ? 'ring-4 ring-brand-pink/60' : ''}`} style={CHECKER}>
                      <img src={s.src} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}