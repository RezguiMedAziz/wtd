export const STATUS_FLOW = ['confirmed', 'preparing', 'prepared', 'shipped', 'delivered'];

export const STATUS = {
  confirmed: { label: 'Order placed', badge: 'bg-brand-butter' },
  preparing: { label: 'Being prepared', badge: 'bg-brand-sky' },
  prepared: { label: 'Prepared', badge: 'bg-brand-blue' },
  shipped: { label: 'Shipped', badge: 'bg-brand-yellow' },
  delivered: { label: 'Delivered', badge: 'bg-green-300' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-200' },
};

export const statusLabel = (s) => STATUS[s]?.label || s;
export const money = (v, currency = '€') => `${(Number(v) || 0).toFixed(2)} ${currency}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');