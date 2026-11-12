import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpToLine, Box, EyeOff, ImagePlus, ImageUp, Loader2, Save, Send, Trash2, Upload, X } from 'lucide-react';
import { ACCEPT_ATTR } from '../../services/stickerService';
import { adminService } from '../../services/adminService';
import StickerLayer from '../../components/customizer/StickerLayer';
import SheetViewer3D from '../../components/stickersheets/SheetViewer3D';
import { CHECKER, toLayerStickers } from '../../components/stickersheets/sheetUtils';
import { SheetBadge } from './AdminSheets';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

function Preview3D({ sheet, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="3D preview">
      <button type="button" aria-label="Close preview" className="absolute inset-0 bg-brand-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border-[3px] border-brand-ink bg-black shadow-soft">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border-[3px] border-brand-ink bg-white"><X size={18} aria-hidden /></button>
        <SheetViewer3D sheet={sheet} className="h-[70vh]" />
        <p className="bg-white px-4 py-2 text-center text-xs font-bold text-brand-ink/65">This is exactly how customers will see the sheet. Drag to rotate · scroll to zoom · double-click a sticker.</p>
      </div>
    </div>,
    document.body,
  );
}

export default function AdminSheetEditor() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', ratio: 1.35, backgroundOpacity: 1 });
  const [stickers, setStickers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [keepBg, setKeepBg] = useState(false);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const bgRef = useRef(null);
  const queue = useRef(Promise.resolve());

  const apply = (s) => {
    setSheet(s);
    setForm({ name: s.name, description: s.description || '', ratio: s.ratio, backgroundOpacity: s.backgroundOpacity ?? 1 });
    setStickers(s.stickers.map((x) => ({ ...x })));
    setDirty(false);
  };

  useEffect(() => {
    const ctl = new AbortController();
    adminService.getSheet(id, { signal: ctl.signal }).then(apply).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, [id]);

  const layerStickers = useMemo(() => toLayerStickers({ stickers: stickers.map((s, i) => ({ ...s, z: i })) }), [stickers]);
  const current = stickers.find((s) => s.id === selected);
  const published = sheet?.status === 'published';
  const background = sheet?.background || null;

  const patch = (uid, p) => { setStickers((l) => l.map((s) => (s.id === uid ? { ...s, ...p } : s))); setDirty(true); };
  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const toFront = (uid) => { setStickers((l) => [...l.filter((s) => s.id !== uid), l.find((s) => s.id === uid)]); setDirty(true); };

  const handleFiles = (list) => {
    Array.from(list || []).forEach((file) => {
      if (!ACCEPT.includes(file.type)) { setError(`${file.name}: only PNG, JPG and WebP pictures are supported.`); return; }
      const pid = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const remove = !keepBg; // decided when the upload starts, like on the customer side
      setPending((p) => [...p, { id: pid, name: file.name, status: 'Waiting…' }]);
      queue.current = queue.current.then(async () => {
        setPending((p) => p.map((x) => (x.id === pid ? { ...x, status: remove ? 'Removing background…' : 'Uploading…' } : x)));
        try {
          const st = await adminService.uploadSheetSticker(id, file, { removeBackground: remove });
          setStickers((l) => [...l, st]);
          setError('');
        } catch (e) {
          setError(`${file.name}: ${e.message}`);
        } finally {
          setPending((p) => p.filter((x) => x.id !== pid));
        }
      });
    });
  };

  const replaceFile = async (file) => {
    if (!file || !current) return;
    setBusy('replace'); setError('');
    try {
      const st = await adminService.replaceSheetSticker(id, current.id, file, { removeBackground: !keepBg });
      patch(current.id, { src: st.src, ar: st.ar, name: st.name, keptBackground: st.keptBackground });
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  // The sheet background is stored on the server right away (like sticker uploads). Only the picture is
  // updated locally, so unsaved layout edits are never thrown away.
  const uploadBackground = async (file) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) { setError('The background must be a PNG, JPG or WebP picture.'); return; }
    setBusy('background'); setError(''); setNotice('');
    try {
      const s = await adminService.uploadSheetBackground(id, file);
      setSheet((cur) => ({ ...cur, background: s.background, updatedAt: s.updatedAt }));
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const clearBackground = async () => {
    if (!window.confirm('Remove the background of this sheet?')) return;
    setBusy('background'); setError(''); setNotice('');
    try {
      const s = await adminService.deleteSheetBackground(id);
      setSheet((cur) => ({ ...cur, background: s.background || null, updatedAt: s.updatedAt }));
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const remove = async (uid) => {
    if (!window.confirm('Remove this sticker from the sheet?')) return;
    setError('');
    try {
      await adminService.deleteSheetSticker(id, uid);
      setStickers((l) => l.filter((s) => s.id !== uid));
      setSelected((s) => (s === uid ? null : s));
    } catch (e) { setError(e.message); }
  };

  const layout = () => stickers.map((s, i) => ({ id: s.id, x: s.x, y: s.y, w: s.w, rot: s.rot || 0, z: i }));
  const persist = () => adminService.saveSheet(id, { name: form.name.trim() || 'Untitled sheet', description: form.description, ratio: form.ratio, backgroundOpacity: form.backgroundOpacity, layout: layout() });

  const run = async (kind, fn, done) => {
    setBusy(kind); setError(''); setNotice('');
    try { apply(await fn()); setNotice(done); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const save = () => run('save', persist, published ? 'Saved — changes are live.' : 'Draft saved.');
  const publish = () => run('publish', async () => { await persist(); return adminService.publishSheet(id); }, 'Published — customers can use this sheet now.');
  const unpublish = () => run('unpublish', async () => { if (dirty) await persist(); return adminService.unpublishSheet(id); }, 'Unpublished — it is now a draft.');

  if (error && !sheet) return <div><Link to="/admin/sticker-sheets" className="text-sm font-bold underline">← All sheets</Link><p role="alert" className="mt-3 font-semibold text-red-600">{error}</p></div>;
  if (!sheet) return <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading sheet…</p>;

  // With a background, the canvas becomes a "stage": the picture fills it and the sheet floats on top as a frosted
  // panel, like the customer sees it. Without one, the canvas is the plain checkerboard sheet.
  const sheetPct = Math.min(66, 112.5 / form.ratio);
  const stageStyle = background ? { aspectRatio: '4 / 5' } : undefined;
  // the picture sits on a black base and fades toward it, exactly like the 3D view
  const bgLayerStyle = background
    ? { backgroundImage: `url("${background}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: form.backgroundOpacity }
    : undefined;
  const boardStyle = background
    ? { width: `${sheetPct}%`, aspectRatio: `1 / ${form.ratio}`, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }
    : { aspectRatio: `1 / ${form.ratio}`, ...CHECKER };

  return (
    <div>
      <Link to="/admin/sticker-sheets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4"><ArrowLeft size={15} aria-hidden /> All sheets</Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Edit sticker sheet</h1>
        <SheetBadge status={sheet.status} />
        {dirty && <span className="text-sm font-bold text-brand-ink/60">● unsaved changes</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => setPreview({ ratio: form.ratio, background, backgroundOpacity: form.backgroundOpacity, stickers: stickers.map((s, i) => ({ ...s, z: i })) })} disabled={!stickers.length} className="btn-pop bg-white !px-4 !py-2 text-sm disabled:opacity-50"><Box size={16} aria-hidden /> Preview in 3D</button>
          <button type="button" onClick={save} disabled={!!busy} className="btn-pop bg-brand-blue !px-4 !py-2 text-sm disabled:opacity-60">{busy === 'save' ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />} {published ? 'Save changes' : 'Save draft'}</button>
          {published
            ? <button type="button" onClick={unpublish} disabled={!!busy} className="btn-pop bg-white !px-4 !py-2 text-sm disabled:opacity-60"><EyeOff size={16} aria-hidden /> Unpublish</button>
            : <button type="button" onClick={publish} disabled={!!busy || !stickers.length} className="btn-pop bg-brand-pink !px-4 !py-2 text-sm disabled:opacity-60">{busy === 'publish' ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Send size={16} aria-hidden />} Publish</button>}
        </div>
      </div>
      {published && <p className="mb-3 rounded-2xl bg-brand-butter px-3 py-2 text-sm font-semibold">This sheet is live: saving changes updates it for new customers immediately. Orders already placed are not affected.</p>}
      {notice && <p role="status" className="mb-3 text-sm font-bold text-green-700">{notice}</p>}
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr),22rem]">
        {/* canvas */}
        <section className="sticker-card bg-brand-butter p-5" aria-label="Sheet canvas">
          <p className="mb-3 text-center text-sm font-semibold text-brand-ink/70">Drag stickers to arrange them · select one to resize, rotate or remove it</p>
          <div
            className={`mx-auto w-full max-w-lg ${background ? 'relative grid place-items-center overflow-hidden rounded-[1.6rem] border-[3px] border-brand-ink bg-black' : ''}`}
            style={stageStyle}
          >
            {background && <div className="absolute inset-0" style={bgLayerStyle} aria-hidden />}
            <div
              className={`relative ${background ? 'rounded-[1.4rem] border-2 border-white/70' : 'w-full rounded-[1.6rem] border-[3px] border-brand-ink'}`}
              style={boardStyle}
            >
              <StickerLayer interactive stickers={layerStickers} selectedUid={selected} onSelect={setSelected} onChange={patch} onRemove={remove} />
              {!stickers.length && !pending.length && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-bold text-brand-ink/50">Upload pictures to start building the sheet →</p>}
            </div>
          </div>
        </section>

        {/* side panel */}
        <div className="flex flex-col gap-4">
          <section className="sticker-card p-4" aria-label="Sheet details">
            <label className="block text-sm font-bold">Name
              <input value={form.name} maxLength={80} onChange={(e) => setField('name', e.target.value)} className="mt-1 w-full rounded-full border-[3px] border-brand-ink px-4 py-2 text-base font-normal outline-none focus:bg-brand-sky" />
            </label>
            <label className="mt-3 block text-sm font-bold">Description
              <textarea value={form.description} maxLength={500} rows={3} onChange={(e) => setField('description', e.target.value)} className="mt-1 w-full rounded-2xl border-[3px] border-brand-ink px-4 py-2 text-sm font-normal outline-none focus:bg-brand-sky" />
            </label>
            <label className="mt-3 block text-sm font-bold">Sheet height ({form.ratio.toFixed(2)}× width)
              <input type="range" min="0.8" max="2" step="0.05" value={form.ratio} onChange={(e) => setField('ratio', +e.target.value)} className="mt-1 w-full accent-[#FF7FBD]" />
            </label>
          </section>

          <section className="sticker-card p-4" aria-label="Sheet background">
            <h2 className="mb-1 text-lg font-bold">Background</h2>
            <p className="mb-3 text-xs font-semibold text-brand-ink/65">A full-page picture (collage, pattern…) shown behind the sheet in the 3D view, exactly as customers will see it. Portrait pictures (4:5) work best.</p>
            <input ref={bgRef} type="file" accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} onChange={(e) => { uploadBackground(e.target.files?.[0]); e.target.value = ''; }} />
            {background && (
              <>
                <div className="relative mb-3 overflow-hidden rounded-2xl border-[3px] border-brand-ink bg-black" style={{ aspectRatio: '4 / 3' }} role="img" aria-label="Current sheet background">
                  <div className="absolute inset-0" style={bgLayerStyle} />
                </div>
                <label className="mb-3 block text-sm font-bold">Opacity ({Math.round(form.backgroundOpacity * 100)}%)
                  <input type="range" min="10" max="100" step="5" value={Math.round(form.backgroundOpacity * 100)} onChange={(e) => setField('backgroundOpacity', +e.target.value / 100)} className="mt-1 w-full accent-[#FF7FBD]" />
                </label>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => bgRef.current?.click()} disabled={busy === 'background'} className="btn-pop bg-brand-blue !px-3 !py-1.5 text-xs disabled:opacity-60">
                {busy === 'background' ? <Loader2 className="animate-spin" size={14} aria-hidden /> : <ImagePlus size={14} aria-hidden />} {background ? 'Replace background' : 'Upload background'}
              </button>
              {background && <button type="button" onClick={clearBackground} disabled={busy === 'background'} className="btn-pop bg-white !px-3 !py-1.5 text-xs disabled:opacity-60"><Trash2 size={14} aria-hidden /> Remove</button>}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-brand-ink/55">The background is saved as soon as it is uploaded{published ? ' — and is live for customers right away.' : '; customers see it once you publish.'}</p>
          </section>

          <section className="sticker-card p-4" aria-label="Upload stickers">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              className={`rounded-2xl border-[3px] border-dashed border-brand-ink/70 p-3 text-center transition-colors ${dragOver ? 'bg-brand-sky' : 'bg-brand-cream'}`}
            >
              <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-pop bg-brand-blue !py-2 text-sm"><Upload size={16} aria-hidden /> Upload stickers</button>
              <p className="mt-1.5 text-xs font-semibold text-brand-ink/65">or drop PNG / JPG / WebP here · {keepBg ? 'background kept as it is' : 'background removed automatically'}</p>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={keepBg} onChange={(e) => setKeepBg(e.target.checked)} className="h-4 w-4 accent-[#FF7FBD]" />
                Keep the background (don’t cut the picture out)
              </label>
              <p className="mt-1 text-[11px] font-semibold text-brand-ink/55">Transparent PNGs keep their transparency either way.</p>
            </div>
            {pending.map((p) => (
              <p key={p.id} role="status" className="mt-2 flex items-center gap-2 rounded-xl bg-brand-butter px-3 py-1.5 text-xs font-bold"><Loader2 className="animate-spin" size={14} aria-hidden /> <span className="truncate">{p.name}</span> <span className="ml-auto shrink-0 opacity-70">{p.status}</span></p>
            ))}
          </section>

          <section className="sticker-card p-4" aria-label="Stickers">
            <h2 className="mb-2 text-lg font-bold">Stickers ({stickers.length})</h2>
            {!!stickers.length && (
              <ul className="grid max-h-52 grid-cols-5 gap-2 overflow-y-auto pr-1">
                {stickers.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSelected(s.id)} title={s.name} aria-label={`Select ${s.name}`} aria-pressed={selected === s.id}
                      className={`grid aspect-square w-full place-items-center rounded-xl border-[3px] border-brand-ink p-1 ${selected === s.id ? 'ring-4 ring-brand-pink/60' : ''}`} style={CHECKER}>
                      <img src={s.src} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {current ? (
              <div className="mt-3 grid gap-3 border-t-2 border-dashed border-brand-ink/25 pt-3" aria-live="polite">
                <p className="truncate text-sm font-bold" title={current.name}>{current.name} <span className="font-normal opacity-60">· {current.keptBackground ? 'background kept' : 'cut out'}</span></p>
                <label className="text-sm font-bold">Size
                  <input type="range" min="4" max="60" value={Math.round(current.w)} onChange={(e) => patch(current.id, { w: +e.target.value })} className="mt-1 w-full accent-[#FF7FBD]" />
                </label>
                <label className="text-sm font-bold">Rotation ({Math.round(current.rot || 0)}°)
                  <input type="range" min="-180" max="180" value={Math.round(current.rot || 0)} onChange={(e) => patch(current.id, { rot: +e.target.value })} className="mt-1 w-full accent-[#5CC2FA]" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toFront(current.id)} className="btn-pop bg-brand-yellow !px-3 !py-1.5 text-xs"><ArrowUpToLine size={14} aria-hidden /> To front</button>
                  <input ref={replaceRef} type="file" accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} onChange={(e) => { replaceFile(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" onClick={() => replaceRef.current?.click()} disabled={busy === 'replace'} className="btn-pop bg-brand-blue !px-3 !py-1.5 text-xs disabled:opacity-60">{busy === 'replace' ? <Loader2 className="animate-spin" size={14} aria-hidden /> : <ImageUp size={14} aria-hidden />} Replace image</button>
                  <button type="button" onClick={() => remove(current.id)} className="btn-pop bg-brand-pink !px-3 !py-1.5 text-xs"><Trash2 size={14} aria-hidden /> Remove</button>
                </div>
              </div>
            ) : !!stickers.length && <p className="mt-3 text-center text-xs font-semibold text-brand-ink/60">Select a sticker to edit it.</p>}
          </section>
        </div>
      </div>

      {preview && <Preview3D sheet={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}