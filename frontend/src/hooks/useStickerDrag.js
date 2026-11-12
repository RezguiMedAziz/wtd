import { useEffect, useMemo, useRef, useState } from 'react';

const preventScroll = (e) => e.preventDefault();

/**
 * Pointer-based drag from the sticker panel onto the case (mouse, pen and touch).
 * Touch uses a short press-and-hold so the panel can still be scrolled; a plain tap/click adds the sticker.
 * onDrop(item, pos) — pos is {x,y} in % of the canvas, or null for a tap (caller picks a spot).
 */
export function useStickerDrag({ canvasRef, onDrop }) {
  const [ghost, setGhost] = useState(null);
  const [over, setOver] = useState(false);
  const dropRef = useRef(onDrop);
  useEffect(() => { dropRef.current = onDrop; }, [onDrop]);

  const api = useMemo(() => {
    let st = null;
    const inside = (x, y) => {
      const r = canvasRef.current?.getBoundingClientRect();
      return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom ? r : null;
    };
    function cleanup() {
      if (st?.timer) clearTimeout(st.timer);
      st = null;
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cleanup);
      setGhost(null); setOver(false);
    }
    function onMove(e) {
      if (!st) return;
      const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
      if (!st.active) {
        if (st.touch && dist > 10) { cleanup(); return; } // the user is scrolling
        if (!st.touch && dist > 5) st.active = true;
      }
      if (st.active) {
        st.moved = st.moved || dist > 5;
        setGhost({ item: st.item, x: e.clientX, y: e.clientY });
        setOver(!!inside(e.clientX, e.clientY));
      }
    }
    function onUp(e) {
      if (!st) return;
      const s = st;
      if (s.active && s.moved) {
        const r = inside(e.clientX, e.clientY);
        if (r) dropRef.current(s.item, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      } else if (!s.touch || s.tap) {
        dropRef.current(s.item, null);
      }
      cleanup();
    }
    function start(e, item) {
      if (e.button > 0) return;
      cleanup();
      const touch = e.pointerType === 'touch';
      st = { item, x0: e.clientX, y0: e.clientY, touch, active: !touch, moved: false, tap: true, timer: null };
      if (touch) {
        st.timer = setTimeout(() => {
          if (!st) return;
          st.active = true; st.tap = false;
          window.addEventListener('touchmove', preventScroll, { passive: false });
          setGhost({ item, x: st.x0, y: st.y0 });
        }, 260);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', cleanup);
    }
    return { start, cleanup };
  }, [canvasRef]);

  useEffect(() => api.cleanup, [api]);

  const bind = (item) => ({
    onPointerDown: (e) => api.start(e, item),
    onKeyDown(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropRef.current(item, null); } },
    onDragStart: (e) => e.preventDefault(),
  });
  return { bind, ghost, over };
}
