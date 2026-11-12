import { STATUS } from '../../constants/orderStatus';

export default function StatusBadge({ status, className = '' }) {
  const s = STATUS[status] || { label: status, badge: 'bg-white' };
  return <span className={`inline-block rounded-full border-2 border-brand-ink px-2.5 py-0.5 text-xs font-bold ${s.badge} ${className}`}>{s.label}</span>;
}