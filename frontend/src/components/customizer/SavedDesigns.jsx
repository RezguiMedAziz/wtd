import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { customizationService, hydrate } from '../../services/customizationService';
import { useCustomization } from '../../context/CustomizationContext';
import PhonePreview from './PhonePreview';
import StickerLayer from './StickerLayer';

export default function SavedDesigns({ onClose }) {
  const { dispatch } = useCustomization();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    customizationService.list().then((l) => alive && setDesigns(l)).catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock the page scroll while the popup is open so only the designs list scrolls.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const open = (d) => { dispatch({ type: 'load', design: d }); onClose(); };
  const remove = async (d) => {
    try { await customizationService.remove(d.id); setDesigns((l) => l.filter((x) => x.id !== d.id)); } catch (e) { setError(e.message); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="My designs">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-brand-ink/35" onClick={onClose} />
      {/* Flex column + max height: header stays visible, only the list scrolls. */}
      <div className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-[2rem] border-[3px] border-brand-ink bg-white p-5 shadow-soft">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">My designs</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] border-brand-ink hover:bg-brand-yellow"><X size={18} aria-hidden /></button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {loading && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading…</p>}
          {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}
          {!loading && !error && !designs.length && <p className="font-semibold text-brand-ink/65">Nothing saved yet. Finish a design and press “Save my design”.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {designs.map((d) => {
              const h = hydrate(d);
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-[1.6rem] border-[3px] border-brand-ink bg-brand-cream p-3">
                  <PhonePreview phone={h.phone} caseType={h.caseType} color={h.color} className="w-16 shrink-0"><StickerLayer stickers={h.stickers} /></PhonePreview>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.name}</p>
                    <p className="text-xs text-brand-ink/60">{h.phone.name} · {h.stickers.length} stickers</p>
                    <p className="text-xs text-brand-ink/60">{new Date(d.updatedAt).toLocaleDateString()}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => open(d)} className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-yellow px-3 py-0.5 text-xs font-bold"><Pencil size={12} aria-hidden /> Open</button>
                      <button type="button" onClick={() => remove(d)} aria-label={`Delete ${d.name}`} className="grid h-7 w-7 place-items-center rounded-full border-[3px] border-brand-ink bg-white"><Trash2 size={12} aria-hidden /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}