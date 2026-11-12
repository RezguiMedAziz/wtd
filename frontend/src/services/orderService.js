import { apiClient } from './api/apiClient';
import { authGate, GATE_CANCELLED } from './authGate';
import { customizationService, emitDesignGone, isLocalId, resolveDesignId, savedToPayload, toPayload } from './customizationService';

const CANCELLED_MESSAGE = 'Please complete your details to place your order.';

// The backend stores one order with one immutable snapshot per design (order items) and returns ONE reference.
// Payment and shipping are not implemented yet (see backend/app/routers/orders.py).
export const orderService = {
  // "Confirm order" in the Review step: orders the design being reviewed (an order with a single item).
  // Guests get the onboarding popup first; the order is placed right after they finish it.
  async createOrder(state, name) {
    const result = await authGate.require(() => {
      const designId = resolveDesignId(state.designId);
      return apiClient.post('/orders', {
        items: [{ design: toPayload(state, name), designId: designId && !isLocalId(designId) ? designId : null, quantity: 1 }],
      });
    });
    if (result === GATE_CANCELLED) throw new Error(CANCELLED_MESSAGE);
    emitDesignGone(state.designId, resolveDesignId(state.designId)); // ordered designs leave the cart
    return result;
  },

  // "Checkout" in the cart: ALL saved designs in the cart are submitted together as ONE order (same popup for guests).
  // Resolves with the order ({ reference, items: [...] }). It is all-or-nothing: if any design is rejected,
  // no order is created and the cart stays untouched.
  async checkoutCart(items) {
    const designs = items.filter((i) => i.kind === 'design');
    if (!designs.length) throw new Error('Save a design first, then check out from your cart.');
    const result = await authGate.require(async () => {
      const lines = [];
      for (const item of designs) {
        const id = resolveDesignId(item.id); // synced guest designs get a new id
        let saved;
        try {
          saved = await customizationService.get(id);
        } catch (err) {
          throw new Error(`“${item.name}” could not be loaded (${err.message || 'unknown error'}). Remove it from the cart or open it again.`);
        }
        lines.push({
          cartId: item.id,
          designId: id,
          line: { design: savedToPayload(saved), designId: isLocalId(id) ? null : id, quantity: item.qty },
        });
      }
      const order = await apiClient.post('/orders', { items: lines.map((l) => l.line) });
      return { order, ids: lines.flatMap((l) => [l.cartId, l.designId]) };
    });
    if (result === GATE_CANCELLED) throw new Error(CANCELLED_MESSAGE);
    emitDesignGone(result.ids);
    return result.order;
  },

  list: () => apiClient.get('/orders'),
  cancel: (reference) => apiClient.post(`/orders/${encodeURIComponent(reference)}/cancel`),
};