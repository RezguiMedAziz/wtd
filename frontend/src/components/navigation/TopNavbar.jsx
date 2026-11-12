import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, Menu, Minus, PackageCheck, Pencil, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { NAV_ITEMS } from '../../constants/navigation';
import { ROUTES } from '../../constants/routes';
import { LOGO_SRC } from '../../constants/ducks';
import { formatPrice, useCart } from '../../context/Cartcontext';
import { useCustomization } from '../../context/CustomizationContext';
import { customizationService, resolveDesignId } from '../../services/customizationService';
import { orderService } from '../../services/orderService';

function CartButton() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { dispatch } = useCustomization();
  const { items, count, total, setQty, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok: boolean, text: string }
  const ref = useRef(null);
  const hasDesigns = items.some((i) => i.kind === 'design');

  // Close on outside click / Escape (not while an order is being placed, e.g. when the popup is open)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !busy && ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && !busy && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy]);

  useEffect(() => {
    if (!open) setMessage(null);
  }, [open]);

  // Guests see the onboarding popup first; all designs in the cart are then ordered together as ONE order.
  const checkout = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const order = await orderService.checkoutCart(items);
      const n = order.items?.length || 1;
      setMessage({ ok: true, text: `Order placed! Reference: ${order.reference} (${n} design${n === 1 ? '' : 's'}, ${order.quantity} case${order.quantity === 1 ? '' : 's'})` });
    } catch (err) {
      setMessage({ ok: false, text: err.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
      setOpen(true);
    }
  };

  // Re-opens a design from the cart in the customizer (replaces the design currently being edited).
  const edit = async (item) => {
    setMessage(null);
    try {
      const design = await customizationService.get(resolveDesignId(item.id));
      dispatch({ type: 'load', design });
      setOpen(false);
      navigate(ROUTES.phonesCases);
    } catch (err) {
      setMessage({ ok: false, text: `Could not open “${item.name}”: ${err.message || 'unknown error'}` });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-pop relative bg-brand-yellow !px-3 !py-2 sm:!px-4"
      >
        <ShoppingCart size={22} aria-hidden />
        <span className="hidden text-base sm:inline">Cart</span>
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-[3px] border-brand-ink bg-brand-pink px-1 text-xs font-bold leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Your cart"
            initial={{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            // Flex column + max height: header/total/checkout stay visible, only the item list scrolls.
            className="sticker-card fixed inset-x-4 top-[5rem] z-50 flex max-h-[calc(100dvh-6.5rem)] flex-col p-4 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-xl font-bold">Your cart</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close cart"
                className="rounded-full border-[3px] border-brand-ink bg-white p-1 hover:bg-brand-yellow disabled:opacity-50"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="chalk-card shrink-0 px-4 py-6 text-center font-bold">Your cart is empty 🦆</p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex shrink-0 items-center gap-3 rounded-2xl border-[3px] border-brand-ink bg-white/85 p-2"
                  >
                    {item.image && (
                      <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-xl border-2 border-brand-ink object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{item.name}</p>
                      {item.details && <p className="text-xs text-brand-ink/70">{item.details}</p>}
                      <p className="text-sm">{formatPrice(item.price)}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty - 1)}
                          disabled={busy}
                          aria-label={`Decrease ${item.name}`}
                          className="rounded-full border-2 border-brand-ink bg-white p-0.5 hover:bg-brand-yellow disabled:opacity-50"
                        >
                          <Minus size={14} aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm font-bold" aria-live="polite">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty + 1)}
                          disabled={busy}
                          aria-label={`Increase ${item.name}`}
                          className="rounded-full border-2 border-brand-ink bg-white p-0.5 hover:bg-brand-yellow disabled:opacity-50"
                        >
                          <Plus size={14} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {item.kind === 'design' && (
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          disabled={busy}
                          aria-label={`Edit ${item.name}`}
                          title="Edit this design"
                          className="rounded-full border-2 border-brand-ink bg-white p-1.5 hover:bg-brand-blue disabled:opacity-50"
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={busy}
                        aria-label={`Remove ${item.name}`}
                        className="rounded-full border-2 border-brand-ink bg-white p-1.5 hover:bg-brand-pink disabled:opacity-50"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex shrink-0 items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {message && (
              <p
                role={message.ok ? 'status' : 'alert'}
                className={`mt-3 shrink-0 rounded-2xl border-[3px] border-brand-ink px-3 py-2 text-sm font-bold ${message.ok ? 'bg-brand-yellow/60' : 'bg-white text-red-600'}`}
              >
                {message.text}
              </p>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={busy || !hasDesigns}
              className="btn-pop mt-3 w-full shrink-0 bg-brand-pink !py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <PackageCheck aria-hidden />}
              {busy ? 'Placing order…' : 'Checkout'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopNavbar({ onOpenMenu }) {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.path));

  return (
    // Outer wrapper keeps the bar sticky and leaves breathing room from the sidebar's rounded edge.
    <div className="sticky top-0 z-30 bg-brand-cream/90 px-3 pb-3 pt-3 backdrop-blur sm:px-4 md:px-6">
      <header className="flex items-center gap-3 rounded-full border-[3px] border-brand-ink bg-brand-blue px-3 py-2 shadow-soft sm:px-4">
        {/* Mobile: menu button + logo (the sidebar shows the logo on desktop) */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="rounded-full border-[3px] border-brand-ink bg-white p-2 md:hidden"
        >
          <Menu aria-hidden />
        </button>
        <img src={LOGO_SRC} alt="What The Duck" className="h-10 w-auto md:hidden" />

        {/* Desktop: current section title */}
        {current && (
          <h1 className="hidden truncate pl-3 text-2xl font-bold md:block">{current.label}</h1>
        )}

        <div className="ml-auto flex items-center gap-3">
          <CartButton />
        </div>
      </header>
    </div>
  );
}