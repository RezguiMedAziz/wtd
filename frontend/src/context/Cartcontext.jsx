import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storageService } from '../services/storageService';
import { DESIGN_GONE, DESIGN_SAVED } from '../services/customizationService';

// Change these to your shop's currency / price.
export const CURRENCY = '€';
export const CASE_PRICE = 25;
export const formatPrice = (value) => `${(Number(value) || 0).toFixed(2)} ${CURRENCY}`;

const CartContext = createContext(null);
const STORAGE_KEY = 'cart';

// An item looks like: { id, name, price, image?, details?, qty, kind? }
// Saved designs use kind: 'design' and their design id as the item id. Every saved design is its own cart item,
// and all of them are submitted together as one order at checkout.
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = storageService.get(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    storageService.set(STORAGE_KEY, items);
  }, [items]);

  const addItem = useCallback((item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { ...item, qty }];
    });
  }, []);

  /** Adds a saved design to the cart. Saving the same design again only updates it (no extra quantity). */
  const addDesign = useCallback((design, price = CASE_PRICE) => {
    setItems((prev) => {
      const entry = { id: design.id, kind: 'design', name: design.name, price, image: design.image, details: design.details };
      return prev.some((i) => i.id === design.id)
        ? prev.map((i) => (i.id === design.id ? { ...i, name: design.name, details: design.details ?? i.details } : i))
        : [...prev, { ...entry, qty: 1 }];
    });
  }, []);

  /** After guest designs are synced to the backend their ids change: { oldId: newId }. */
  const replaceIds = useCallback((map) => {
    if (!map || !Object.keys(map).length) return;
    setItems((prev) => prev.map((i) => (map[i.id] ? { ...i, id: map[i.id] } : i)));
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  }, []);

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  // customizationService / orderService announce saved, deleted and ordered designs.
  useEffect(() => {
    const onSaved = (e) => e.detail && addDesign(e.detail);
    const onGone = (e) => {
      const ids = e.detail?.ids || [];
      if (ids.length) setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    };
    window.addEventListener(DESIGN_SAVED, onSaved);
    window.addEventListener(DESIGN_GONE, onGone);
    return () => {
      window.removeEventListener(DESIGN_SAVED, onSaved);
      window.removeEventListener(DESIGN_GONE, onGone);
    };
  }, [addDesign]);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((sum, i) => sum + i.qty * (Number(i.price) || 0), 0),
      addItem,
      addDesign,
      replaceIds,
      setQty,
      removeItem,
      clear,
    }),
    [items, addItem, addDesign, replaceIds, setQty, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}