import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadCsv } from '../api.js';
import { money, fmtDate, StatusBadge } from '../utils.jsx';

const STATUSES = ['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'];

// Combined purchase-record search: filter by customer, product, SKU, status, date range; export CSV.
export default function RecordsSearch() {
  const [f, setF] = useState({ customer: '', product: '', sku: '', status: '', from: '', to: '' });
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function queryString() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
    return params.toString();
  }

  async function run(e) {
    e?.preventDefault();
    setError(''); setBusy(true);
    try { const d = await api.get(`/trace/records?${queryString()}`); setRecords(d.records); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function exportCsv() {
    setError('');
    try {
      const qs = queryString();
      await downloadCsv(`/trace/records?format=csv${qs ? '&' + qs : ''}`, 'purchase-records.csv');
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="topbar"><h1>Combined Purchase Search</h1></div>
      <p className="muted" style={{ marginTop: -8 }}>
        One row per purchased line item. Filter across customers, products, SKUs, order status, and date range — then export to CSV.
      </p>

      <div className="card">
        <form onSubmit={run}>
          <div className="filters">
            <div><label>Customer (name/email/phone)</label><input value={f.customer} onChange={set('customer')} /></div>
            <div><label>Product name</label><input value={f.product} onChange={set('product')} /></div>
            <div><label>SKU</label><input value={f.sku} onChange={set('sku')} /></div>
            <div><label>Order status</label>
              <select value={f.status} onChange={set('status')}>
                <option value="">Any</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label>From date</label><input type="date" value={f.from} onChange={set('from')} /></div>
            <div><label>To date</label><input type="date" value={f.to} onChange={set('to')} /></div>
          </div>
          <div className="row spacer">
            <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
            <button className="btn btn-sm btn-ghost" type="button"
              onClick={() => { setF({ customer: '', product: '', sku: '', status: '', from: '', to: '' }); setRecords(null); }}>
              Reset
            </button>
            <button className="btn btn-sm btn-blue" type="button" onClick={exportCsv}
              disabled={!records || records.length === 0}>⬇ Export CSV</button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {records && (
        <>
          <p className="muted">{records.length} record(s){records.length === 2000 ? ' (showing first 2000)' : ''}.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order</th><th>Status</th><th>Date</th><th>Customer</th><th>Email</th><th>Product</th><th>SKU</th><th>Price paid</th><th>Qty</th><th className="right">Line total</th></tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td><Link to={`/orders/${r.order_id || ''}`}>{r.order_number}</Link></td>
                    <td><StatusBadge status={r.order_status} /></td>
                    <td className="muted">{fmtDate(r.placed_at)}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.customer_email}</td>
                    <td>{r.product_name}<div className="muted">{r.variant_name}</div></td>
                    <td>{r.sku}</td>
                    <td>{money(r.unit_price)}</td>
                    <td>{r.quantity}</td>
                    <td className="right">{money(r.line_total)}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan="10" className="muted">No records match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
