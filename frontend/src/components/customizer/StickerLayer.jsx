import { useRef } from 'react';
import { RotateCw, X } from 'lucide-react';

const MARGIN = 2;
const MIN_W = 8;
const MAX_W = 100;
// Matches the phone's rounded corners (PhonePreview sets --phone-r on its container).
const PHONE_RADIUS = 'var(--phone-r, 0px)';

/**
 * Renders stickers over the phone back. With `interactive`, supports move / resize / rotate / delete (pointer + touch).
 * A sticker with `fill: true` is fitted to the whole case (cover) and always sits behind the other stickers.
 */
export default function StickerLayer({ stickers, selectedUid, onSelect, onChange, onRemove, interactive = false, layerRef }) {
  const local = useRef(null);
  const root = layerRef || local;
  const drag = useRef(null);

const clampPos = (s, w, x, y, rect) => {
  const hw = w / 2;
  const hh = (w * s.ar * rect.width) / rect.height / 2;
  const fit = (half, v) => (half + MARGIN > 100 - half - MARGIN ? 50 : Math.min(100 - half - MARGIN, Math.max(half + MARGIN, v)));
  return { x: fit(hw, x), y: fit(hh, y) };
};

  const begin = (e, s, type) => {
    e.stopPropagation();
    if (s.fill) {
      // full-case stickers stay in place: a tap selects (or unselects) them
      onSelect?.(selectedUid === s.uid ? null : s.uid);
      return;
    }
    onSelect?.(s.uid);
    const rect = root.current.getBoundingClientRect();
    drag.current = { type, uid: s.uid, s, rect, sx: e.clientX, sy: e.clientY };
    root.current.setPointerCapture(e.pointerId);
  };

  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const { rect, s } = d;
    if (d.type === 'move') {
      const x = s.x + ((e.clientX - d.sx) / rect.width) * 100;
      const y = s.y + ((e.clientY - d.sy) / rect.height) * 100;
      onChange(d.uid, clampPos(s, s.w, x, y, rect));
    } else {
      // corner handle: distance from the sticker center sets the size, its angle sets the rotation
      const cx = rect.left + (s.x / 100) * rect.width;
      const cy = rect.top + (s.y / 100) * rect.height;
      const vx = e.clientX - cx, vy = e.clientY - cy;
      const phi = Math.atan2(s.ar, 1);
      const widthPx = (2 * Math.hypot(vx, vy)) / Math.hypot(1, s.ar);
      const w = Math.min(MAX_W, Math.max(MIN_W, (widthPx / rect.width) * 100));
      const rot = ((Math.atan2(vy, vx) - phi) * 180) / Math.PI;
      onChange(d.uid, { w, rot: Math.round(rot), ...clampPos(s, w, s.x, s.y, rect) });
    }
  };
  const end = (e) => {
    if (drag.current) root.current.releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const onKey = (e, s) => {
    if (!interactive) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemove(s.uid); return; }
    if (s.fill) return; // nothing else to adjust on a full-case sticker
    const rect = root.current.getBoundingClientRect();
    const step = e.shiftKey ? 5 : 1;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (keys[e.key]) { e.preventDefault(); onChange(s.uid, clampPos(s, s.w, s.x + keys[e.key][0], s.y + keys[e.key][1], rect)); }
    else if (e.key === '+' || e.key === '=') onChange(s.uid, { w: Math.min(MAX_W, s.w + 3) });
    else if (e.key === '-') onChange(s.uid, { w: Math.max(MIN_W, s.w - 3) });
  };

  return (
    <div
      ref={root}
      className="absolute inset-0"
      style={interactive ? { touchAction: 'none' } : { pointerEvents: 'none' }}
      onPointerMove={interactive ? move : undefined}
      onPointerUp={interactive ? end : undefined}
      onPointerCancel={interactive ? end : undefined}
      onPointerDown={interactive ? () => onSelect?.(null) : undefined}
    >
      {stickers.map((s, i) => {
        const selected = interactive && s.uid === selectedUid;
        const handlers = {
          role: interactive ? 'button' : undefined,
          tabIndex: interactive ? 0 : undefined,
          'aria-label': interactive
            ? (s.fill ? 'Full-case sticker — tap to select, Delete to remove' : 'Sticker — drag to move, arrow keys to nudge, Delete to remove')
            : undefined,
          onKeyDown: (e) => onKey(e, s),
          onFocus: interactive ? () => onSelect?.(s.uid) : undefined,
          onPointerDown: interactive ? (e) => begin(e, s, 'move') : undefined,
        };

        if (s.fill) {
          return (
            <div
              key={s.uid}
              {...handlers}
              className={interactive ? 'cursor-pointer touch-none outline-none' : ''}
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
            >
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: PHONE_RADIUS }}>
                <img src={s.src} alt="" draggable={false} className="pointer-events-none block h-full w-full select-none object-cover" />
              </div>
              {selected && (
                <>
                  <span className="pointer-events-none absolute inset-0 border-2 border-dashed border-brand-ink" style={{ borderRadius: PHONE_RADIUS }} />
                  <button
                    type="button" aria-label="Remove sticker" title="Remove"
                    onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(s.uid)}
                    className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-brand-ink bg-brand-pink"
                  ><X size={16} aria-hidden /></button>
                </>
              )}
            </div>
          );
        }

        return (
          <div
            key={s.uid}
            {...handlers}
            className={interactive ? 'cursor-grab touch-none outline-none active:cursor-grabbing' : ''}
            style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, transform: `translate(-50%, -50%) rotate(${s.rot}deg)`, zIndex: i + 1 }}
          >
            <img src={s.src} alt="" draggable={false} className="pointer-events-none block w-full select-none" />
            {selected && (
              <>
                <span className="pointer-events-none absolute -inset-1 rounded-xl border-2 border-dashed border-brand-ink bg-white/10" />
                <button
                  type="button" aria-label="Remove sticker" title="Remove"
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(s.uid)}
                  className="absolute -left-4 -top-4 grid h-8 w-8 place-items-center rounded-full border-[3px] border-brand-ink bg-brand-pink"
                ><X size={16} aria-hidden /></button>
                <span
                  role="slider" aria-label="Resize and rotate" aria-valuenow={Math.round(s.w)} title="Drag to resize and rotate"
                  onPointerDown={(e) => begin(e, s, 'handle')}
                  className="absolute -bottom-4 -right-4 grid h-8 w-8 cursor-nwse-resize touch-none place-items-center rounded-full border-[3px] border-brand-ink bg-brand-yellow"
                ><RotateCw size={15} aria-hidden /></span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}