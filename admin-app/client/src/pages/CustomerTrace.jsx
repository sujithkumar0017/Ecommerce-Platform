import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate, StatusBadge } from '../utils.jsx';

// Customer -> every product they ever purchased (traced through orders).
export default function CustomerTrace() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function search(e) {
    e?.preventDefault();
    setError(''); setData(null); setSelected(null);
    try { setResults((await api.get(`/trace/customers?q=${encodeURIComponent(q)}`)).customers); }
    catch (e) { setError(e.message); }
  }

  async function pick(c) {
    setSelected(c); setError('');
    try { setData(await api.get(`/trace/customers/${c.id}/purchases`)); }
    catch (e) { setError(e.message); }
  }

  const totalSpent = data?.purchases
    ?.filter((p) => p.order_status !== 'cancelled')
    .reduce((s, p) => s + Number(p.line_total), 0) || 0;

  return (
    <div>
      <div className="topbar">
        <h1>Customer → Purchases</h1>
        <Link to="/trace/products" className="btn btn-ghost btn-sm">Flip: Product → Buyers ⇄</Link>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        Search a customer, then see every product they’ve bought — traced through their actual orders.
      </p>

      <div className="card">
        <form className="row" onSubmit={search}>
          <input placeholder="Search by name, email, phone, or customer ID…" value={q}
            onChange={(e) => setQ(e.target.value)} autoFocus />
          <button className="btn btn-sm" type="submit">Search</button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {results.length > 0 && !selected && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th></th></tr></thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td><td>{c.name}</td><td>{c.email}</td><td>{c.phone || '—'}</td><td>{c.order_count}</td>
                  <td><button className="link-btn" onClick={() => pick(c)}>View purchases →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {results.length === 0 && q && !selected && !error && <p className="muted">No customers found. Try a different search.</p>}

      {selected && data && (
        <div>
          <div className="card between">
            <div>
              <h2 style={{ margin: 0 }}>{data.customer.name}</h2>
              <div className="muted">{data.customer.email} · {data.customer.phone || '—'} · Customer #{data.customer.id}</div>
            </div>
            <div className="right">
              <div className="muted">Lifetime spend (excl. cancelled)</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{money(totalSpent)}</div>
              <button className="link-btn" onClick={() => { setSelected(null); setData(null); }}>← Back to results</button>
            </div>
          </div>

          {data.purchases.length === 0 ? <p className="muted">This customer hasn’t purchased anything yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>SKU</th><th>Price paid</th><th>Qty</th><th>Line total</th><th>Order</th><th>Status</th><th>Purchased</th></tr>
                </thead>
                <tbody>
                  {data.purchases.map((p) => (
                    <tr key={p.order_item_id}>
                      <td><Link to="/trace/products">{p.product_name}</Link><div className="muted">{p.variant_name}</div></td>
                      <td>{p.sku}</td>
                      <td>{money(p.unit_price)}</td>
                      <td>{p.quantity}</td>
                      <td>{money(p.line_total)}</td>
                      <td><Link to={`/orders/${p.order_id}`}>{p.order_number}</Link></td>
                      <td><StatusBadge status={p.order_status} /></td>
                      <td className="muted">{fmtDate(p.placed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
