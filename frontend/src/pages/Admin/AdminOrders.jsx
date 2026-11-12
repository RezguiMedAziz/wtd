import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { STATUS, STATUS_FLOW, fmtDate, money } from '../../constants/orderStatus';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/common/StatusBadge';

const TABS = ['all', ...STATUS_FLOW, 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const filter = TABS.includes(params.get('status')) ? params.get('status') : 'all';

  useEffect(() => {
    const ctl = new AbortController();
    adminService.listOrders({ signal: ctl.signal }).then(setOrders).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, []);

  const counts = useMemo(() => {
    const c = { all: orders?.length || 0 };
    (orders || []).forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);
  const shown = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Orders</h1>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={filter === t} onClick={() => setParams(t === 'all' ? {} : { status: t })}
            className={`rounded-full border-[3px] border-brand-ink px-3 py-1 text-sm font-bold ${filter === t ? 'bg-brand-yellow shadow-soft' : 'bg-white hover:bg-brand-sky'}`}>
            {t === 'all' ? 'All' : STATUS[t].label} <span className="opacity-60">{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      {!orders && !error && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading…</p>}
      {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}
      {orders && !shown.length && <p className="font-semibold text-brand-ink/65">No orders here.</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((o) => (
          <li key={o.reference}>
            <Link to={`/admin/orders/${o.reference}`} className="sticker-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.reference} <StatusBadge status={o.status} className="ml-2" /></p>
                <p className="truncate text-sm text-brand-ink/70">{o.customerName} · {o.email}</p>
              </div>
              <div className="hidden text-right text-sm sm:block">
                <p className="font-bold">{money(o.total, o.currency)} · {o.designCount} design{o.designCount === 1 ? '' : 's'} · {o.quantity} case{o.quantity === 1 ? '' : 's'}</p>
                <p className="text-brand-ink/60">{fmtDate(o.createdAt)}</p>
              </div>
              <ChevronRight aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}