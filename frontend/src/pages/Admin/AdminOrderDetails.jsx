import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Eye, Loader2, X } from 'lucide-react';
import { adminService, saveBlob } from '../../services/adminService';
import { hydrate } from '../../services/customizationService';
import { stickerService } from '../../services/stickerService';
import { caseService, useCaseConfig } from '../../services/caseService';
import DesignPreview from '../../components/customizer/DesignPreview';
import OrderStatusPanel from '../../components/admin/OrderStatusPanel';

// checkerboard so PNG transparency is visible
const CHECKER = { backgroundImage: 'conic-gradient(#e9e6ef 25%, #fff 0 50%, #e9e6ef 0 75%, #fff 0)', backgroundSize: '16px 16px' };
const EXT = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };
const fmtBytes = (n) => (n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function Lightbox({ src, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close preview" className="absolute inset-0 bg-brand-ink/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl rounded-[2rem] border-[3px] border-brand-ink bg-white p-4 shadow-soft">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border-[3px] border-brand-ink bg-white"><X size={18} aria-hidden /></button>
        <p className="mb-3 truncate pr-12 font-bold">{title}</p>
        <div className="grid max-h-[75vh] place-items-center overflow-auto rounded-2xl p-2" style={CHECKER}>
          <img src={src} alt={title} className="max-h-[70vh] max-w-full object-contain" />
        </div>
      </div>
    </div>,
    document.body
  );
}

function FileRow({ title, lines, src, state, onPreview, onDownload, busy }) {
  const unavailable = state === 'unavailable';
  return (
    <li className="flex items-center gap-3 rounded-[1.6rem] border-[3px] border-brand-ink bg-white p-3">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-brand-ink" style={CHECKER}>
        {state === 'loading' && <Loader2 className="animate-spin" size={20} aria-label="Loading" />}
        {unavailable && <AlertTriangle size={22} className="text-red-600" aria-label="Unavailable" />}
        {state === 'ready' && src && <img src={src} alt="" className="max-h-full max-w-full object-contain" draggable={false} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold" title={title}>{title}</p>
        {lines.filter(Boolean).map((l) => <p key={l} className="text-xs text-brand-ink/65">{l}</p>)}
        {unavailable && <p className="text-xs font-bold text-red-600">File no longer available</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={state !== 'ready'} onClick={onPreview} className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-butter px-3 py-0.5 text-xs font-bold disabled:opacity-50"><Eye size={13} aria-hidden /> Preview</button>
          <button type="button" disabled={unavailable || busy} onClick={onDownload} className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-blue px-3 py-0.5 text-xs font-bold disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={13} aria-hidden /> : <Download size={13} aria-hidden />} Download
          </button>
        </div>
      </div>
    </li>
  );
}

export default function AdminOrderDetails() {
  const { reference } = useParams();
  useCaseConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [urls, setUrls] = useState({}); // uploadId -> blob URL (false = failed)
  const [zoom, setZoom] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const cache = useRef({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const store = cache.current;
    return () => { mounted.current = false; Object.values(store).forEach((u) => u && URL.revokeObjectURL(u)); };
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    setData(null); setError(''); setIndex(0); setNotice('');
    adminService.getOrder(reference, { signal: ctl.signal }).then(setData).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, [reference]);

  const files = useMemo(() => Object.fromEntries((data?.files || []).map((f) => [f.id, f])), [data]);
  const items = data?.order.items || [];
  const item = items[index];
  const design = item?.design;

  const uploadIds = useMemo(() => (design ? [...new Set([
    ...(design.uploads || []).map((u) => u.id),
    ...(design.stickers || []).filter((s) => s.kind === 'upload').map((s) => s.refId),
  ])] : []), [design]);

  // Load the customer's own files of the selected design through the secured endpoint (never through the public /media URLs).
  useEffect(() => {
    uploadIds.forEach(async (id) => {
      if (cache.current[id] !== undefined || !files[id]?.available) return;
      cache.current[id] = null; // in flight
      try {
        const url = URL.createObjectURL(await adminService.fetchFile(reference, id));
        if (!mounted.current) { URL.revokeObjectURL(url); return; }
        cache.current[id] = url;
        setUrls((u) => ({ ...u, [id]: url }));
      } catch {
        cache.current[id] = false;
        if (mounted.current) setUrls((u) => ({ ...u, [id]: false }));
      }
    });
  }, [uploadIds, files, reference]);

  const loading = uploadIds.some((id) => files[id]?.available && urls[id] === undefined);

  // Same hydrate() the customer pages use, so the render is identical. Uploaded images come from the blob URLs;
  // sticker-sheet stickers use the frozen copy stored with the order.
  const view = useMemo(() => {
    if (!design) return null;
    return hydrate({
      ...design,
      stickers: (design.stickers || []).map((s) => (s.kind === 'upload' ? { ...s, src: urls[s.refId] || undefined } : s)),
      uploads: (design.uploads || []).map((u) => ({ ...u, src: urls[u.id] || undefined })),
    });
  }, [design, urls]);

  const missing = design && view && !loading ? design.stickers.length - view.stickers.length : 0;

  const sheetAssets = design?.sheetAssets || [];

  // LEGACY: old orders placed with the removed built-in stickers
  const builtins = useMemo(() => {
    const seen = new Map();
    (design?.stickers || []).filter((s) => s.kind === 'builtin').forEach((s) => {
      if (!seen.has(s.refId)) seen.set(s.refId, { id: s.refId, asset: stickerService.findBuiltIn(s.refId), uses: 0 });
      seen.get(s.refId).uses += 1;
    });
    return [...seen.values()];
  }, [design]);

  const download = async (id) => {
    setBusyId(id); setNotice('');
    try { await adminService.downloadFile(reference, files[id]); } catch (e) { setNotice(e.message); } finally { setBusyId(''); }
  };
  const downloadSheetAsset = async (a) => {
    setBusyId(a.id); setNotice('');
    try { await adminService.downloadSheetAsset(reference, a); } catch (e) { setNotice(e.message); } finally { setBusyId(''); }
  };
  const downloadBuiltin = async (b) => {
    setBusyId(b.id); setNotice('');
    try {
      const blob = await (await fetch(b.asset.src)).blob();
      saveBlob(blob, `${b.id}.${EXT[blob.type] || 'png'}`);
    } catch { setNotice('Could not download this built-in sticker.'); } finally { setBusyId(''); }
  };

  const back = <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4"><ArrowLeft size={15} aria-hidden /> All orders</Link>;
  if (error) return <div>{back}<p role="alert" className="font-semibold text-red-600">{error}</p></div>;
  if (!data) return <div>{back}<p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading order…</p></div>;

  const { order } = data;
  const c = order.customer || {};
  const colorInfo = view?.caseType === 'silicone' ? caseService.color(view.color) : null;

  return (
    <div>
      {back}

      <section className="sticker-card p-5" aria-label="Order summary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{order.reference}</h1>
            <p className="text-sm text-brand-ink/70">{new Date(order.createdAt).toLocaleString()} · {order.status} · {items.length} design{items.length === 1 ? '' : 's'} · {order.quantity} case{order.quantity === 1 ? '' : 's'}</p>
          </div>
          <p className="rounded-2xl bg-brand-cream p-3 text-sm"><b>{c.firstName} {c.lastName}</b> · {c.mobile}<br />{c.email}<br />{c.address}, {c.postalCode} {c.city}</p>
        </div>
        {order.notes && <p className="mt-3 rounded-2xl border-[3px] border-dashed border-brand-ink/60 bg-brand-butter px-3 py-2 text-sm font-semibold">Customer notes: {order.notes}</p>}
      </section>

      <OrderStatusPanel order={order} onChanged={(o) => setData((d) => ({ ...d, order: o }))} />

      {items.length > 1 && (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Designs in this order">
          {items.map((it, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === index} onClick={() => { setIndex(i); setNotice(''); }}
              className={`rounded-full border-[3px] border-brand-ink px-4 py-1.5 text-sm font-bold ${i === index ? 'bg-brand-yellow shadow-soft' : 'bg-white hover:bg-brand-sky'}`}>
              Design {i + 1} · {it.design.name} <span className="opacity-60">×{it.quantity}</span>
            </button>
          ))}
        </nav>
      )}

      {item && view && (
        <>
          <h2 className="mt-5 text-2xl font-bold" aria-live="polite">
            Design {index + 1} of {items.length}: {design.name} <span className="ml-1 rounded-full border-[3px] border-brand-ink bg-brand-pink px-3 py-0.5 align-middle text-base">Quantity ×{item.quantity}</span>
          </h2>

          <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr),auto]">
            {/* LEFT: original files */}
            <section className="order-2 lg:order-1" aria-label="Original design files">
              <h3 className="mb-3 text-xl font-bold">Original design files</h3>
              {notice && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">{notice}</p>}
              <ul className="flex flex-col gap-3">
                {uploadIds.map((id) => {
                  const f = files[id];
                  const state = !f?.available || urls[id] === false ? 'unavailable' : urls[id] ? 'ready' : 'loading';
                  const up = (design.uploads || []).find((u) => u.id === id);
                  return (
                    <FileRow key={id} title={f?.downloadName || up?.name || 'Uploaded picture'} src={urls[id]} state={state} busy={busyId === id}
                      lines={[
                        'Customer upload',
                        f?.available ? `${(f.contentType || '').replace('image/', '').toUpperCase()}${f.width ? ` · ${f.width}×${f.height}px` : ''} · ${fmtBytes(f.sizeBytes)}` : '',
                        f?.keptBackground ? 'Background kept (full-case artwork)' : f?.available ? 'Background removed (transparent PNG)' : '',
                      ]}
                      onPreview={() => setZoom({ src: urls[id], title: f?.downloadName || up?.name })} onDownload={() => download(id)} />
                  );
                })}
                {sheetAssets.map((a) => (
                  <FileRow key={a.id} title={a.name || 'Sheet sticker'} src={a.src} state="ready" busy={busyId === a.id}
                    lines={[`From sticker sheet “${a.sheetName || '—'}”`, a.keptBackground ? 'Background kept' : 'Transparent']}
                    onPreview={() => setZoom({ src: a.src, title: a.name })} onDownload={() => downloadSheetAsset(a)} />
                ))}
                {builtins.map((b) => (
                  <FileRow key={b.id} title={b.asset?.label || b.id} src={b.asset?.src} state={b.asset ? 'ready' : 'unavailable'} busy={busyId === b.id}
                    lines={[`Old built-in sticker · used ${b.uses}×`]}
                    onPreview={() => setZoom({ src: b.asset.src, title: b.asset.label })} onDownload={() => downloadBuiltin(b)} />
                ))}
              </ul>
              {!uploadIds.length && !sheetAssets.length && !builtins.length && <p className="font-semibold text-brand-ink/60">This design has no stickers or pictures.</p>}
            </section>

            {/* RIGHT: phone preview (read-only) */}
            <section className="sticker-card order-1 flex flex-col items-center bg-brand-butter p-5 lg:sticky lg:top-24 lg:order-2" aria-label="Phone case preview">
              {loading
                ? <p className="mb-3 flex items-center gap-2 text-sm font-semibold" role="status"><Loader2 className="animate-spin" size={16} aria-hidden /> Loading images…</p>
                : <DesignPreview s={view} className="w-[min(70vw,17rem)] sm:w-[19rem]" />}
              {missing > 0 && (
                <p role="alert" className="mt-3 flex max-w-xs items-start gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /> {missing} element{missing === 1 ? '' : 's'} of this design could not be displayed (file or asset unavailable).
                </p>
              )}
              <dl className="mt-5 w-full max-w-xs space-y-1.5 text-sm">
                {[
                  ['Phone', `${design.phone.brand === 'Custom' ? '' : `${design.phone.brand} `}${design.phone.name}`],
                  ['Case', view.caseType === 'silicone' ? 'Silicone' : 'Transparent'],
                  ...(design.sheet?.name ? [['Sticker sheet', design.sheet.name]] : []),
                ].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b-2 border-dashed border-brand-ink/20 pb-1"><dt className="font-bold">{k}</dt><dd className="text-right">{v}</dd></div>)}
                {colorInfo && (
                  <div className="flex justify-between gap-4 border-b-2 border-dashed border-brand-ink/20 pb-1">
                    <dt className="font-bold">Color</dt>
                    <dd className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-brand-ink" style={{ background: colorInfo.hex }} aria-hidden />{colorInfo.label}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 pb-1"><dt className="font-bold">Stickers placed</dt><dd>{design.stickers.length}</dd></div>
              </dl>
              {design.needsVerification && <p className="mt-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold">Custom phone model, needs verification before production.</p>}
            </section>
          </div>
        </>
      )}

      {zoom && <Lightbox src={zoom.src} title={zoom.title || 'Preview'} onClose={() => setZoom(null)} />}
    </div>
  );
}