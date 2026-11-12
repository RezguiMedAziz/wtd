import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Loader2, Trash2, Upload, X } from 'lucide-react';
import { stickerService, ACCEPT_ATTR } from '../../services/stickerService';
import { SHEETS_PATH, useSheet } from '../../services/sheetService';
import { uploadOptions } from '../../services/uploadOptions';
import { useCustomization } from '../../context/CustomizationContext';

function Thumb({ item, bind, onRemove }) {
  return (
    <li className="relative">
      <button type="button" {...bind(item)} title={`${item.label} — drag onto the case, or tap to add`} aria-label={`Add sticker ${item.label}`}
        className="grid aspect-square w-full cursor-grab touch-pan-y place-items-center rounded-2xl border-[3px] border-brand-ink bg-white p-2 hover:bg-brand-butter active:cursor-grabbing">
        <img src={item.src} alt="" draggable={false} className="pointer-events-none max-h-full max-w-full select-none object-contain" />
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Delete uploaded sticker ${item.label}`} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-brand-ink bg-brand-pink"><Trash2 size={12} aria-hidden /></button>
      )}
    </li>
  );
}

/** Stickers come from the selected sticker sheet (each one individually) or from the customer's own uploads. */
export default function StickerPanel({ bind, uploads: up }) {
  const { state, dispatch } = useCustomization();
  const { sheet, loading: sheetLoading, error: sheetError } = useSheet(state.sheet?.id);
  const [tab, setTab] = useState(state.sheet ? 'sheet' : 'mine');
  const [dragOver, setDragOver] = useState(false);
  const [keepBg, setKeepBg] = useState(uploadOptions.keepBackground);
  const fileRef = useRef(null);
  const full = up.used >= up.max;
  const sheetItems = (sheet?.stickers || []).map((s) => ({ id: s.id, kind: 'sheet', label: s.name, src: s.src, ar: s.ar }));

  const toggleKeepBg = (value) => {
    uploadOptions.keepBackground = value;
    setKeepBg(value);
  };

  return (
    <aside className="sticker-card flex max-h-[70vh] min-h-[22rem] flex-col p-4 lg:max-h-none" aria-label="Sticker collection">
      <h3 className="text-lg font-bold">Sticker collection</h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); up.handleFiles(e.dataTransfer.files); setTab('mine'); }}
        className={`mt-3 rounded-2xl border-[3px] border-dashed border-brand-ink/70 p-3 text-center transition-colors ${dragOver ? 'bg-brand-sky' : 'bg-brand-cream'}`}
      >
        <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} onChange={(e) => { up.handleFiles(e.target.files); e.target.value = ''; setTab('mine'); }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={full} className="btn-pop bg-brand-blue py-2 text-sm disabled:opacity-50"><Upload size={16} aria-hidden /> Upload pictures</button>
        <p className="mt-1.5 text-xs font-semibold text-brand-ink/65">or drop them here · PNG, JPG, WebP · {keepBg ? 'background kept as it is' : 'background removed automatically'}</p>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 text-xs font-bold">
          <input type="checkbox" checked={keepBg} onChange={(e) => toggleKeepBg(e.target.checked)} className="h-4 w-4 accent-[#FF7FBD]" />
          Keep the background (for full-case artwork)
        </label>
        <p className={`mt-1 text-xs font-bold ${full ? 'text-red-600' : ''}`}>{up.used}/{up.max} uploads{full ? ' — limit reached' : ''}</p>
      </div>
      {up.messages.map((m) => (
        <p key={m.id} role="alert" className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
          <span className="flex-1">{m.text}</span>
          <button type="button" onClick={() => up.dismiss(m.id)} aria-label="Dismiss"><X size={14} aria-hidden /></button>
        </p>
      ))}

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Sticker sources">
        <button role="tab" aria-selected={tab === 'sheet'} type="button" onClick={() => setTab('sheet')}
          className={`max-w-[11rem] truncate rounded-full border-[3px] border-brand-ink px-3 py-0.5 text-xs font-bold ${tab === 'sheet' ? 'bg-brand-yellow' : 'bg-white'}`}>
          {sheet ? `${sheet.name} (${sheet.stickerCount})` : 'Sticker sheet'}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} type="button" onClick={() => setTab('mine')}
          className={`rounded-full border-[3px] border-brand-ink px-3 py-0.5 text-xs font-bold ${tab === 'mine' ? 'bg-brand-yellow' : 'bg-white'}`}>{`Mine (${state.uploads.length})`}</button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {tab === 'sheet' && (
          <>
            {!state.sheet && (
              <div className="rounded-2xl border-[3px] border-dashed border-brand-ink/60 bg-brand-butter p-3 text-center text-sm font-semibold">
                No sticker sheet selected yet.
                <Link to={SHEETS_PATH} className="btn-pop mt-2 bg-brand-pink !px-4 !py-1.5 text-sm"><Layers size={16} aria-hidden /> Browse sticker sheets</Link>
              </div>
            )}
            {state.sheet && sheetLoading && <p className="flex items-center justify-center gap-2 text-sm font-semibold" role="status"><Loader2 className="animate-spin" size={16} aria-hidden /> Loading stickers…</p>}
            {state.sheet && sheetError && (
              <div role="alert" className="rounded-2xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
                {sheetError}
                <Link to={SHEETS_PATH} className="mt-2 block font-bold underline">Choose another sticker sheet</Link>
              </div>
            )}
            {sheet && (
              <>
                <p className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-brand-ink/65">
                  <span>Tap or drag a sticker onto the case</span>
                  <Link to={SHEETS_PATH} className="underline">Change sheet</Link>
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                  {sheetItems.map((s) => <Thumb key={s.id} item={s} bind={bind} />)}
                </ul>
              </>
            )}
          </>
        )}

        {tab === 'mine' && (
          <>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
              {state.pending.map((p) => (
                <li key={p.id} className="grid aspect-square place-items-center rounded-2xl border-[3px] border-dashed border-brand-ink/60 bg-brand-butter p-1 text-center" role="status">
                  <span><Loader2 className="mx-auto animate-spin" size={20} aria-hidden /><span className="block text-[10px] font-bold leading-tight">{p.status}</span></span>
                </li>
              ))}
              {state.uploads.map((u) => (
                <Thumb key={u.id} item={{ id: u.id, kind: 'upload', label: u.name, src: u.src, ar: u.ar }} bind={bind} onRemove={() => { stickerService.deleteUpload(u.id); dispatch({ type: 'removeUpload', id: u.id }); }} />
              ))}
            </ul>
            {!state.uploads.length && !state.pending.length && <p className="mt-4 text-center text-sm font-semibold text-brand-ink/60">Your uploaded stickers will appear here.</p>}
          </>
        )}
      </div>
    </aside>
  );
}