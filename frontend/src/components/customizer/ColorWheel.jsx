import { useEffect, useRef, useState } from 'react';
import { hexToHsv, hsvToHex, isHex } from '../../utils/ColorPicker';

const HUES = 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
const FALLBACK = '#ff7fbd';
const wrap = (h) => ((h % 360) + 360) % 360;
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Color wheel: angle = hue, distance from the center = saturation, slider = brightness.
 * Also has a hex field. `onChange` receives a lowercase '#rrggbb'.
 */
export default function ColorWheel({ value, onChange }) {
  const wheel = useRef(null);
  const dragging = useRef(false);
  const start = isHex(value) ? value.toLowerCase() : FALLBACK;
  const [hsv, setHsv] = useState(() => hexToHsv(start));
  const [text, setText] = useState(start);
  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // follow outside changes (for example when a ready-made swatch is picked)
  useEffect(() => {
    if (isHex(value) && value.toLowerCase() !== hex) {
      setHsv(hexToHsv(value));
      setText(value.toLowerCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const apply = (next) => {
    const nextHex = hsvToHex(next.h, next.s, next.v);
    setHsv(next);
    setText(nextHex);
    onChange(nextHex);
  };

  const fromPointer = (e) => {
    const r = wheel.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360; // 0° = top, clockwise
    apply({ ...hsv, h, s: clamp01(Math.hypot(dx, dy) / (r.width / 2)) });
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 15 : 5;
    if (e.key === 'ArrowLeft') apply({ ...hsv, h: wrap(hsv.h - step) });
    else if (e.key === 'ArrowRight') apply({ ...hsv, h: wrap(hsv.h + step) });
    else if (e.key === 'ArrowUp') apply({ ...hsv, s: clamp01(hsv.s + step / 100) });
    else if (e.key === 'ArrowDown') apply({ ...hsv, s: clamp01(hsv.s - step / 100) });
    else return;
    e.preventDefault();
  };

  const onHexInput = (e) => {
    let v = e.target.value.trim();
    if (v && v[0] !== '#') v = `#${v}`;
    setText(v);
    if (isHex(v)) {
      setHsv(hexToHsv(v));
      onChange(v.toLowerCase());
    }
  };

  const angle = ((hsv.h - 90) * Math.PI) / 180;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        ref={wheel}
        role="application"
        aria-label="Color wheel. Drag to pick a color, or use the arrow keys."
        tabIndex={0}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={onKeyDown}
        className="relative h-44 w-44 shrink-0 cursor-crosshair touch-none rounded-full border-[3px] border-brand-ink"
        style={{ background: `radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), ${HUES}` }}
      >
        {/* brightness: darkens the whole wheel */}
        <span className="pointer-events-none absolute inset-0 rounded-full bg-black" style={{ opacity: 1 - hsv.v }} />
        <span
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_#141414]"
          style={{ left: `${50 + 50 * hsv.s * Math.cos(angle)}%`, top: `${50 + 50 * hsv.s * Math.sin(angle)}%`, background: hex }}
        />
      </div>

      <div className="w-full max-w-[14rem] space-y-3 text-sm font-bold">
        <label className="block">
          Brightness
          <input
            type="range" min="0" max="100" value={Math.round(hsv.v * 100)}
            onChange={(e) => apply({ ...hsv, v: +e.target.value / 100 })}
            className="mt-1 w-full accent-[#FF7FBD]"
          />
        </label>
        <label className="block">
          Hex code
          <span className="mt-1 flex items-center gap-2">
            <span className="h-9 w-9 shrink-0 rounded-full border-[3px] border-brand-ink" style={{ background: hex }} aria-hidden />
            <input
              value={text} onChange={onHexInput} maxLength={7} spellCheck={false} autoComplete="off"
              className="w-full rounded-full border-[3px] border-brand-ink bg-white px-3 py-1.5 font-mono text-sm uppercase outline-none focus:bg-brand-sky"
            />
          </span>
        </label>
      </div>
    </div>
  );
}