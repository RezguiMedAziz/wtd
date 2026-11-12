import { Check, XCircle } from 'lucide-react';
import { STATUS, STATUS_FLOW, fmtDate } from '../../constants/orderStatus';

export default function OrderTimeline({ order }) {
  const when = {};
  (order.history || []).forEach((e) => { when[e.status] = e.createdAt; }); // last occurrence wins

  if (order.status === 'cancelled') {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl border-[3px] border-brand-ink bg-red-100 px-4 py-3 text-sm font-bold">
        <XCircle size={20} aria-hidden /> Order cancelled{when.cancelled ? ` · ${fmtDate(when.cancelled)}` : ''}
      </p>
    );
  }

  const current = STATUS_FLOW.indexOf(order.status);
  return (
    <ol className="grid gap-2 sm:grid-cols-5" aria-label="Order progress">
      {STATUS_FLOW.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-2xl border-[3px] border-brand-ink p-2 sm:flex-col sm:text-center ${active ? 'bg-brand-yellow shadow-soft' : done ? 'bg-brand-sky' : 'bg-white opacity-60'}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-brand-ink ${active ? 'bg-brand-pink' : 'bg-white'}`}>
              {done || (active && s === 'delivered') ? <Check size={15} aria-hidden /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{STATUS[s].label}</span>
              {(done || active) && when[s] && <span className="block text-[11px] text-brand-ink/70">{fmtDate(when[s])}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}