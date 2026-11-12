import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpToLine, Eraser, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { useCustomization } from '../../context/CustomizationContext';
import { useStickerDrag } from '../../hooks/useStickerDrag';
import { useStickerUploads } from '../../hooks/useStickerUploads';
import PhonePreview from './PhonePreview';
import StickerLayer from './StickerLayer';
import StickerPanel from './StickerPanel';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function StickerStep() {
  const { state, dispatch } = useCustomization();
  const { phone, caseType, color, stickers, selectedUid } = state;
  const canvasRef = useRef(null);
  const uploads = useStickerUploads();
  const selected = stickers.find((s) => s.uid === selectedUid);

  const place = (item, pos) => {
    const w = item.ar > 1.3 ? 24 : item.ar < 0.5 ? 38 : 32;
    const jitter = () => (Math.random() - 0.5) * 12;
    dispatch({
      type: 'addSticker',
      sticker: { kind: item.kind, refId: item.id, src: item.src, ar: item.ar, w, x: clamp(pos ? pos.x : 50 + jitter(), 15, 85), y: clamp(pos ? pos.y : 55 + jitter(), 15, 85) },
    });
  };
  const { bind, ghost, over } = useStickerDrag({ canvasRef, onDrop: place });
  const update = (uid, patch) => dispatch({ type: 'updateSticker', uid, patch });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem),1fr]">
      <StickerPanel bind={bind} uploads={uploads} />

      <section className={`sticker-card flex flex-col items-center p-4 transition-colors sm:p-6 ${over ? 'bg-brand-sky' : 'bg-brand-butter'}`} aria-label="Phone case preview">
        <p className="mb-3 text-center text-sm font-semibold text-brand-ink/70">Drag stickers onto the case · tap one to edit it</p>
        <PhonePreview phone={phone} caseType={caseType} color={color} clip={false} className="w-[min(70vw,17rem)] sm:w-[19rem]">
          <StickerLayer
            layerRef={canvasRef} interactive stickers={stickers} selectedUid={selectedUid}
            onSelect={(uid) => dispatch({ type: 'select', uid })} onChange={update} onRemove={(uid) => dispatch({ type: 'removeSticker', uid })}
          />
        </PhonePreview>

        <div className="mt-6 w-full max-w-md rounded-[1.6rem] border-[3px] border-brand-ink bg-white p-4" aria-live="polite">
          {selected ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">Size
                <input type="range" min="8" max="100" value={Math.round(selected.w)} disabled={!!selected.fill} onChange={(e) => update(selected.uid, { w: +e.target.value })} className="mt-1 w-full accent-[#FF7FBD] disabled:opacity-40" />
              </label>
              <label className="text-sm font-bold">Rotation ({Math.round(selected.rot)}°)
                <input type="range" min="-180" max="180" value={Math.round(selected.rot)} disabled={!!selected.fill} onChange={(e) => update(selected.uid, { rot: +e.target.value })} className="mt-1 w-full accent-[#5CC2FA] disabled:opacity-40" />
              </label>
              <button type="button" aria-pressed={!!selected.fill} onClick={() => update(selected.uid, { fill: !selected.fill })} className="btn-pop bg-brand-blue py-1.5 text-sm sm:col-span-2">
                {selected.fill ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />} {selected.fill ? 'Back to normal size' : 'Fit to full case'}
              </button>
              <div className="flex gap-2 sm:col-span-2">
                <button type="button" disabled={!!selected.fill} onClick={() => dispatch({ type: 'toFront', uid: selected.uid })} className="btn-pop flex-1 bg-brand-yellow py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"><ArrowUpToLine size={16} aria-hidden /> To front</button>
                <button type="button" onClick={() => dispatch({ type: 'removeSticker', uid: selected.uid })} className="btn-pop flex-1 bg-brand-pink py-1.5 text-sm"><Trash2 size={16} aria-hidden /> Remove</button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm font-semibold text-brand-ink/65">{stickers.length ? 'Select a sticker to resize, rotate, fit it to the full case or remove it.' : 'No stickers yet — add your first one!'}</p>
          )}
        </div>
        {!!stickers.length && (
          <button type="button" onClick={() => dispatch({ type: 'clearStickers' })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4"><Eraser size={15} aria-hidden /> Clear all stickers</button>
        )}
      </section>

      {ghost && createPortal(
        <img src={ghost.item.src} alt="" className="pointer-events-none fixed z-[200] w-20 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-lg" style={{ left: ghost.x, top: ghost.y }} />,
        document.body
      )}
    </div>
  );
}