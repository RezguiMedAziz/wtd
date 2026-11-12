import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { STATUS, fmtDate, money } from '../../constants/orderStatus';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/common/StatusBadge';

const PERIODS = [7, 30, 90];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');

function Stat({ label, value, sub, tone = 'bg-white' }) {
  return (
    <div className={`sticker-card p-4 ${tone}`}>
      <p className="text-sm font-bold text-brand-ink/65">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-brand-ink/60">{sub}</p>}
    </div>
  );
}

function Bars({ values, labels, format = (v) => v, every = 1, unit = '' }) {
  const max = Math.max(...values, 0);
  const peak = max > 0 ? values.indexOf(max) : -1;
  return (
    <div role="img" aria-label={`Bar chart. Highest: ${peak >= 0 ? `${labels[peak]} (${format(max)})` : 'no data'}`}>
      <div className="flex h-40 items-end gap-[2px]">
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end" title={`${labels[i]}: ${format(v)}${unit}`}>
            <div className={`w-full rounded-t-md ${v > 0 ? 'border-2 border-brand-ink' : ''} ${i === peak ? 'bg-brand-pink' : 'bg-brand-blue'}`}
              style={{ height: max ? `${(v / max) * 100}%` : 0, minHeight: v > 0 ? 4 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] font-bold text-brand-ink/60">
        {labels.map((l, i) => <span key={i} className="flex-1 overflow-visible whitespace-nowrap text-center">{i % every === 0 ? l : ''}</span>)}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctl = new AbortController();
    setError('');
    adminService.stats(days, { signal: ctl.signal }).then(setData).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctl.abort();
  }, [days]);

  if (error) return <p role="alert" className="font-semibold text-red-600">{error}</p>;
  if (!data) return <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading dashboard…</p>;

  const cur = data.currency;
  const peakHour = Math.max(...data.by_hour ?? data.byHour);
  const hours = data.byHour;
  const hp = hours.indexOf(Math.max(...hours));
  const wd = data.byWeekday;
  const wp = wd.indexOf(Math.max(...wd));
  const hasTraffic = hours.some((v) => v > 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={days === p} onClick={() => setDays(p)}
              className={`rounded-full border-[3px] border-brand-ink px-4 py-1 text-sm font-bold ${days === p ? 'bg-brand-yellow' : 'bg-white hover:bg-brand-sky'}`}>Last {p} days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label={`Revenue · ${days} days`} value={money(data.revenue, cur)} sub={`${money(data.revenueAllTime, cur)} all time`} tone="bg-brand-butter" />
        <Stat label="Orders" value={data.orders} sub={data.cancelled ? `${data.cancelled} cancelled` : 'none cancelled'} />
        <Stat label="Active orders" value={data.activeOrders} sub="placed → shipped, all time" tone="bg-brand-sky" />
        <Stat label="Average order" value={money(data.avgOrderValue, cur)} />
        <Stat label="Cases sold" value={data.cases} />
        <Stat label="Busiest hour" value={hasTraffic ? `${pad(hp)}:00–${pad(hp + 1)}:00` : '—'} sub={`${data.timezone} time`} />
      </div>

      <section className="sticker-card mt-6 p-5" aria-label="Order pipeline">
        <h2 className="mb-3 text-xl font-bold">Order pipeline</h2>
        <div className="flex flex-wrap gap-3">
          {data.byStatus.map((s) => (
            <Link key={s.status} to={`/admin/orders?status=${s.status}`} className={`flex items-center gap-2 rounded-full border-[3px] border-brand-ink px-4 py-2 font-bold transition-transform hover:-translate-y-0.5 ${STATUS[s.status].badge}`}>
              {STATUS[s.status].label} <span className="rounded-full bg-white px-2 text-sm">{s.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sticker-card mt-6 p-5" aria-label="Revenue per day">
        <h2 className="mb-3 text-xl font-bold">Money coming in <span className="text-sm font-semibold text-brand-ink/60">per day · {cur}</span></h2>
        <Bars values={data.daily.map((d) => d.revenue)} labels={data.daily.map((d) => d.date.slice(5))} format={(v) => money(v, cur)} every={days <= 7 ? 1 : days <= 30 ? 5 : 10} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="sticker-card p-5" aria-label="Orders by hour">
          <h2 className="mb-1 text-xl font-bold">Active hours</h2>
          <p className="mb-3 text-sm font-semibold text-brand-ink/60">When customers order ({data.timezone})</p>
          <Bars values={hours} labels={hours.map((_, h) => pad(h))} unit=" orders" every={3} />
        </section>
        <section className="sticker-card p-5" aria-label="Orders by weekday">
          <h2 className="mb-1 text-xl font-bold">Active days</h2>
          <p className="mb-3 text-sm font-semibold text-brand-ink/60">{hasTraffic ? `Busiest: ${WEEKDAYS[wp]}` : 'No orders in this period'}</p>
          <Bars values={wd} labels={WEEKDAYS} unit=" orders" />
        </section>
      </div>

      <section className="sticker-card mt-6 p-5" aria-label="Recent orders">
        <h2 className="mb-3 text-xl font-bold">Recent orders</h2>
        {!data.recent.length && <p className="font-semibold text-brand-ink/60">No orders yet.</p>}
        <ul className="flex flex-col gap-2">
          {data.recent.map((o) => (
            <li key={o.reference}>
              <Link to={`/admin/orders/${o.reference}`} className="flex items-center gap-3 rounded-2xl border-[3px] border-brand-ink bg-white p-3 hover:bg-brand-sky">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{o.reference} <StatusBadge status={o.status} className="ml-2" /></p>
                  <p className="truncate text-sm text-brand-ink/70">{o.customerName} · {fmtDate(o.createdAt)}</p>
                </div>
                <p className="font-bold">{money(o.total, o.currency)}</p>
                <ChevronRight aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}