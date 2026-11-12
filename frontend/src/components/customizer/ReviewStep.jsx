import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, PackageCheck, Plus, Save, ShoppingBag } from 'lucide-react';
import { useCustomization } from '../../context/CustomizationContext';
import { useUser } from '../../context/UserContext';
import { summarize } from '../../controllers/customizationController';
import { DESIGN_SAVED, customizationService } from '../../services/customizationService';
import { orderService } from '../../services/orderService';
import { caseService, useCaseConfig } from '../../services/caseService';
import PhonePreview from './PhonePreview';
import StickerLayer from './StickerLayer';
import Preview from './DesignPreview';

// Names like "iPhone 12 design" are generated from the phone, so they must follow the phone when it changes.
const isAutoName = (n) => !n || /\sdesign$/i.test(String(n).trim());

export default function ReviewStep() {
  const { state, dispatch } = useCustomization();
  const { user } = useUser();
  useCaseConfig();
  const sum = summarize(state);
  const [name, setName] = useState(() => (isAutoName(state.designName) ? `${state.phone.name} design` : state.designName));
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Short description shown for this design in the cart (phone · case · color · stickers).
  const cartDetails = [
    sum.phone, sum.caseType,
    state.caseType === 'silicone' ? caseService.color(state.color).label : null,
    `${sum.stickerCount} sticker${sum.stickerCount === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ');

  // customizationService.save() already puts the design in the cart; this adds its description to that cart item.
  const describeInCart = (rec) => {
    try { window.dispatchEvent(new CustomEvent(DESIGN_SAVED, { detail: { id: rec.id, name: rec.name, details: cartDetails } })); } catch { /* ignore */ }
  };

  const persist = async () => {
    const rec = await customizationService.save(state, { designId: state.designId, name });
    dispatch({ type: 'setDesignId', id: rec.id, name: rec.name });
    describeInCart(rec);
    return rec;
  };

  const save = async () => {
    setBusy(true);
    try { setSaved(await persist()); setError(''); } catch (e) { setError(e.message || 'Could not save your design.'); } finally { setBusy(false); }
  };

  // Saves this design (it stays in the cart) and starts a brand-new one, so the cart can hold several designs.
  const saveAndAddAnother = async () => {
    setBusy(true);
    try { await persist(); dispatch({ type: 'reset' }); } catch (e) { setError(e.message || 'Could not save your design.'); } finally { setBusy(false); }
  };

  const confirmOrder = async () => {
    setBusy(true);
    try {
      const order = await orderService.createOrder(state, name);
      dispatch({ type: 'orderPlaced', order });
    } catch (e) { setError(e.message || 'Could not place the order.'); } finally { setBusy(false); }
  };

  const rows = [
    ['Phone', sum.phone], ['Case', sum.caseType],
    ...(state.caseType === 'silicone' ? [['Color', caseService.color(state.color).label]] : []),
    ['Stickers placed', `${sum.stickerCount} (${sum.uploadedCount} uploaded)`],
  ];

  if (state.checkout === 'done' && state.order) {
    const o = state.order;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="sticker-card mx-auto max-w-2xl bg-brand-butter p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto text-green-600" size={48} aria-hidden />
        <h2 className="mt-2 text-3xl font-bold">Order confirmed!</h2>
        <p className="mt-1 font-semibold">Reference <span className="rounded-full border-[3px] border-brand-ink bg-white px-3 py-0.5">{o.reference}</span></p>
        <div className="mt-5 flex justify-center"><Preview s={state} /></div>
        <dl className="mx-auto mt-5 max-w-sm space-y-1 text-left text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="font-bold">{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="mt-4 text-xs text-brand-ink/60">Your order was saved on the server. Payment and shipping aren’t connected yet (mock checkout).</p>
        <button type="button" onClick={() => dispatch({ type: 'reset' })} className="btn-pop mt-5 bg-brand-pink">Design another case</button>
      </motion.div>
    );
  }

  if (state.checkout === 'confirm') {
    return (
      <div className="sticker-card mx-auto max-w-3xl p-5 sm:p-8">
        <h2 className="text-2xl font-bold">Confirm your order</h2>
        <div className="mt-4 grid items-center gap-6 sm:grid-cols-[auto,1fr]">
          <div className="mx-auto"><Preview s={state} className="w-44" /></div>
          <div>
            <dl className="space-y-1.5 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b-2 border-dashed border-brand-ink/20 pb-1"><dt className="font-bold">{k}</dt><dd>{v}</dd></div>)}</dl>
            {user && <p className="mt-3 rounded-2xl bg-brand-cream p-3 text-sm"><b>Deliver to</b><br />{user.firstName} {user.lastName} · {user.mobile}<br />{user.address}, {user.postalCode} {user.city}</p>}
            {sum.customModel && <p className="mt-2 text-xs font-semibold text-brand-ink/70">Custom phone model — we’ll verify it before production.</p>}
            <p className="mt-2 text-xs text-brand-ink/60">This orders only the design you are reviewing. To order several designs together, use “Checkout” in your cart.</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => dispatch({ type: 'setCheckout', value: 'review' })} className="btn-pop bg-white py-2.5 text-base">Back</button>
          <button type="button" onClick={confirmOrder} disabled={busy} className="btn-pop bg-brand-pink py-2.5 text-base disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <PackageCheck size={18} aria-hidden />} {busy ? 'Placing order…' : 'Confirm order'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[auto,1fr]">
      <div className="sticker-card mx-auto bg-brand-butter p-6"><Preview s={state} className="w-[min(70vw,16rem)]" /></div>
      <div className="sticker-card p-5 sm:p-6">
        <h2 className="text-2xl font-bold">Your design</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b-2 border-dashed border-brand-ink/20 pb-1"><dt className="font-bold">{k}</dt><dd className="text-right">{v}</dd></div>)}
        </dl>
        {sum.customModel && <p className="mt-2 rounded-xl bg-brand-butter px-3 py-1.5 text-xs font-semibold">Custom phone model — flagged for catalog verification.</p>}
        <label className="mt-4 block text-sm font-bold">Design name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="mt-1 w-full rounded-full border-[3px] border-brand-ink px-4 py-2.5 text-base font-normal outline-none focus:bg-brand-sky" />
        </label>
        {saved && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-bold text-green-700"><CheckCircle2 size={18} aria-hidden /> Saved as “{saved.name}” and added to your cart. Reopen it anytime from “My designs” or the cart.</p>}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={save} disabled={busy} className="btn-pop bg-brand-blue py-3 text-base disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />} Save my design</button>
          <button type="button" onClick={() => dispatch({ type: 'setCheckout', value: 'confirm' })} className="btn-pop bg-brand-pink py-3 text-base"><ShoppingBag size={18} aria-hidden /> Order my case</button>
          <button type="button" onClick={saveAndAddAnother} disabled={busy} className="btn-pop bg-brand-yellow py-3 text-base disabled:opacity-60 sm:col-span-2"><Plus size={18} aria-hidden /> Save &amp; design another case</button>
        </div>
      </div>
    </div>
  );
}