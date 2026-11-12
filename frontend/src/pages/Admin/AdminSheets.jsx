import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeOff, Loader2, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { fmtDate } from '../../constants/orderStatus';
import { adminService } from '../../services/adminService';
import SheetFlat from '../../components/stickersheets/SheetFlat';

export const SheetBadge = ({ status }) => (
  <span className={`inline-block rounded-full border-2 border-brand-ink px-2.5 py-0.5 text-xs font-bold ${status === 'published' ? 'bg-green-300' : 'bg-brand-butter'}`}>
    {status === 'published' ? 'Published' : 'Draft'}
  </span>
);

const TABS = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']];

export default function AdminSheets() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const ctl = new AbortController();
    adminService.listSheets({ signal: ctl.signal }).then(setSheets).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, []);

  const counts = useMemo(() => ({
    all: sheets?.length || 0,
    published: (sheets || []).filter((s) => s.status === 'published').length,
    draft: (sheets || []).filter((s) => s.status !== 'published').length,
  }), [sheets]);
  const shown = (sheets || []).filter((s) => filter === 'all' || (filter === 'published') === (s.status === 'published'));

  const replace = (s) => setSheets((l) => l.map((x) => (x.id === s.id ? s : x)));
  const run = async (id, fn) => {
    setBusy(id); setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const create = () => run('new', async () => { const s = await adminService.createSheet(); navigate(`/admin/sticker-sheets/${s.id}`); });
  const toggle = (s) => run(s.id, async () => replace(await (s.status === 'published' ? adminService.unpublishSheet(s.id) : adminService.publishSheet(s.id))));
  const remove = (s) => {
    if (!window.confirm(`Delete “${s.name}”? Customers won’t see it anymore. Orders already placed keep their stickers.`)) return;
    run(s.id, async () => { await adminService.deleteSheet(s.id); setSheets((l) => l.filter((x) => x.id !== s.id)); });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Sticker Sheets</h1>
        <button type="button" onClick={create} disabled={busy === 'new'} className="btn-pop bg-brand-pink !px-5 !py-2 text-base disabled:opacity-60">
          {busy === 'new' ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />} Create sticker sheet
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter sheets">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
            className={`rounded-full border-[3px] border-brand-ink px-3 py-1 text-sm font-bold ${filter === id ? 'bg-brand-yellow shadow-soft' : 'bg-white hover:bg-brand-sky'}`}>
            {label} <span className="opacity-60">{counts[id]}</span>
          </button>
        ))}
      </div>

      {!sheets && !error && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading…</p>}
      {error && <p role="alert" className="mb-3 font-semibold text-red-600">{error}</p>}
      {sheets && !shown.length && <p className="font-semibold text-brand-ink/65">No sticker sheets here yet.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((s) => (
          <li key={s.id} className="sticker-card flex flex-col gap-3 p-4">
            <Link to={`/admin/sticker-sheets/${s.id}`} className="mx-auto block w-40 transition-transform hover:-translate-y-0.5" aria-label={`Edit ${s.name}`}>
              <SheetFlat sheet={s} className="w-full" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold"><span className="truncate">{s.name}</span> <SheetBadge status={s.status} /></p>
              {s.description && <p className="mt-1 line-clamp-2 text-sm text-brand-ink/70">{s.description}</p>}
              <p className="mt-1 text-xs font-semibold text-brand-ink/60">{s.stickerCount} sticker{s.stickerCount === 1 ? '' : 's'} · updated {fmtDate(s.updatedAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/sticker-sheets/${s.id}`} className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-butter px-3 py-1 text-xs font-bold"><Pencil size={13} aria-hidden /> Edit</Link>
              <button type="button" disabled={busy === s.id || (s.status !== 'published' && !s.stickerCount)} onClick={() => toggle(s)}
                className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-brand-blue px-3 py-1 text-xs font-bold disabled:opacity-50">
                {s.status === 'published' ? <EyeOff size={13} aria-hidden /> : <Send size={13} aria-hidden />} {s.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" disabled={busy === s.id} onClick={() => remove(s)} aria-label={`Delete ${s.name}`}
                className="inline-flex items-center gap-1 rounded-full border-[3px] border-brand-ink bg-white px-3 py-1 text-xs font-bold hover:bg-brand-pink disabled:opacity-50"><Trash2 size={13} aria-hidden /> Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}