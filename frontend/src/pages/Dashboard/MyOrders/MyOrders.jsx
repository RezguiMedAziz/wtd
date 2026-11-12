import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, PackageOpen, RefreshCw, XCircle } from 'lucide-react';
import { useUser } from '../../../context/UserContext';
import { ROUTES } from '../../../constants/routes';
import { fmtDate, money } from '../../../constants/orderStatus';
import { orderService } from '../../../services/orderService';
import { hydrate } from '../../../services/customizationService';
import { caseService, useCaseConfig } from '../../../services/caseService';
import DesignPreview from '../../../components/customizer/DesignPreview';
import OrderTimeline from '../../../components/orders/OrderTimeline';
import StatusBadge from '../../../components/common/StatusBadge';

function OrderDesign({ item, index, currency }) {
  const d = item.design;
  const view = hydrate(d);
  const stickers = d.stickers?.length || 0;
  const color = view.caseType === 'silicone' ? caseService.color(view.color).label : null;
  return (
    <li className="flex items-center gap-4 rounded-[1.6rem] border-[3px] border-brand-ink bg-brand-cream p-3">
      <DesignPreview s={view} className="w-20 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-bold">Design {index + 1}: {d.name}</p>
        <p className="text-brand-ink/70">{d.phone.brand === 'Custom' ? '' : `${d.phone.brand} `}{d.phone.name}</p>
        <p className="text-brand-ink/70">{view.caseType === 'silicone' ? 'Silicone case' : 'Transparent case'}{color ? ` · ${color}` : ''}</p>
        <p className="text-brand-ink/70">{stickers} sticker{stickers === 1 ? '' : 's'} · ×{item.quantity}</p>
      </div>
      <p className="font-bold">{money(item.quantity * (Number(d.unitPrice) || 0), currency)}</p>
    </li>
  );
}

function OrderCard({ order, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancel = async () => {
    setBusy(true);
    setError('');
    try { onUpdated(await orderService.cancel(order.reference)); setConfirming(false); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <li className="sticker-card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{order.reference} <StatusBadge status={order.status} className="ml-2" /></p>
          <p className="text-sm text-brand-ink/70">{fmtDate(order.createdAt)} · {order.items.length} design{order.items.length === 1 ? '' : 's'} · {order.quantity} case{order.quantity === 1 ? '' : 's'}</p>
        </div>
        <p className="font-bold">{money(order.total, order.currency)}</p>
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4 border-t-[3px] border-dashed border-brand-ink/30 p-4">
          <OrderTimeline order={order} />
          <div>
            <h3 className="mb-2 text-lg font-bold">What’s in this order</h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {order.items.map((it, i) => <OrderDesign key={i} item={it} index={i} currency={order.currency} />)}
            </ul>
          </div>
          <p className="rounded-2xl bg-brand-cream p-3 text-sm"><b>Deliver to</b><br />{order.customer.firstName} {order.customer.lastName} · {order.customer.mobile}<br />{order.customer.address}, {order.customer.postalCode} {order.customer.city}</p>
          {order.notes && <p className="text-sm font-semibold">Your notes: {order.notes}</p>}

          {order.canCancel && !confirming && (
            <button type="button" onClick={() => setConfirming(true)} className="btn-pop bg-white py-2 text-base"><XCircle size={18} aria-hidden /> Cancel this order</button>
          )}
          {order.canCancel && confirming && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border-[3px] border-brand-ink bg-red-50 p-3" role="alertdialog" aria-label="Confirm cancellation">
              <p className="flex-1 text-sm font-bold">Cancel order {order.reference}? This can’t be undone.</p>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-pop bg-white !px-4 !py-1.5 text-sm">Keep it</button>
              <button type="button" onClick={cancel} disabled={busy} className="btn-pop bg-brand-pink !px-4 !py-1.5 text-sm disabled:opacity-60">
                {busy && <Loader2 className="animate-spin" size={16} aria-hidden />} Yes, cancel
              </button>
            </div>
          )}
          {!order.canCancel && !['cancelled', 'delivered'].includes(order.status) && (
            <p className="text-xs font-semibold text-brand-ink/60">This order is already being prepared, so it can no longer be cancelled online. Contact us if you need help.</p>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}

export default function MyOrders() {
  const { user } = useUser();
  useCaseConfig();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setOrders(await orderService.list()); setError(''); } catch (e) { setError(e.message); } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { // pick up status changes made by the shop when the tab regains focus
    if (!user) return undefined;
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, load]);

  const replace = (o) => setOrders((list) => list.map((x) => (x.reference === o.reference ? o : x)));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-bold sm:text-5xl">
          <span className="text-brand-pink [-webkit-text-stroke:2px_#141414]">My</span>{' '}
          <span className="text-brand-blue [-webkit-text-stroke:2px_#141414]">Orders</span>
        </h1>
        {user && <button type="button" onClick={load} disabled={refreshing} className="btn-pop bg-brand-yellow py-2 text-base disabled:opacity-60"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} aria-hidden /> Refresh</button>}
      </header>

      {!user && (
        <div className="chalk-card p-8 text-center">
          <PackageOpen className="mx-auto" size={40} aria-hidden />
          <p className="mt-2 font-bold">Your orders will appear here once you’ve placed one.</p>
          <Link to={ROUTES.phonesCases} className="btn-pop mt-4 bg-brand-pink">Design a case</Link>
        </div>
      )}
      {user && !orders && !error && <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading your orders…</p>}
      {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}
      {user && orders && !orders.length && (
        <div className="chalk-card p-8 text-center">
          <PackageOpen className="mx-auto" size={40} aria-hidden />
          <p className="mt-2 font-bold">No orders yet.</p>
          <Link to={ROUTES.phonesCases} className="btn-pop mt-4 bg-brand-pink">Design a case</Link>
        </div>
      )}
      <ul className="flex flex-col gap-4">
        {orders?.map((o) => <OrderCard key={o.reference} order={o} onUpdated={replace} />)}
      </ul>
    </div>
  );
}