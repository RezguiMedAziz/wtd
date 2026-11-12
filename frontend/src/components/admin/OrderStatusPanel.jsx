import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { STATUS, STATUS_FLOW, money } from '../../constants/orderStatus';
import { adminService } from '../../services/adminService';
import OrderTimeline from '../orders/OrderTimeline';
import StatusBadge from '../common/StatusBadge';

/** Admin: shows the order's progress and lets the admin move it to another status. */
export default function OrderStatusPanel({ order, onChanged }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const cancelled = order.status === 'cancelled';
  const next = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  const change = async (status) => {
    setBusy(status);
    setError('');
    try { onChanged(await adminService.setStatus(order.reference, status)); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <section className="sticker-card mt-5 p-5" aria-label="Order status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-xl font-bold">Status <StatusBadge status={order.status} /></h2>
        <p className="text-sm font-bold">Total: {money(order.total, order.currency)}</p>
      </div>
      <div className="mt-4"><OrderTimeline order={order} /></div>

      {cancelled ? (
        <p className="mt-4 text-sm font-semibold text-brand-ink/70">The customer cancelled this order. Its status can no longer be changed.</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {next && (
            <button type="button" disabled={!!busy} onClick={() => change(next)} className="btn-pop bg-brand-pink !px-4 !py-2 text-base disabled:opacity-60">
              {busy === next ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />} Mark as “{STATUS[next].label}”
            </button>
          )}
          <span className="text-sm font-bold text-brand-ink/60">or set:</span>
          {STATUS_FLOW.map((s) => (
            <button key={s} type="button" aria-pressed={s === order.status} disabled={!!busy || s === order.status} onClick={() => change(s)}
              className={`rounded-full border-[3px] border-brand-ink px-3 py-1 text-xs font-bold disabled:cursor-not-allowed ${s === order.status ? 'bg-brand-yellow' : 'bg-white hover:bg-brand-sky disabled:opacity-50'}`}>
              {STATUS[s].label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}