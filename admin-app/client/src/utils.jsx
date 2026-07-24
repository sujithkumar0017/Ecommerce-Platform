export const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

export function StatusBadge({ status }) {
  return <span className={`badge s-${status}`}>{status}</span>;
}
